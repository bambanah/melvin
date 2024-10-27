import prisma from "@/server/prisma";
import { RateType } from "@prisma/client";
import jspdf from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import { getRateForActivity, getTotalCostOfActivities } from "./activity-utils";
import { formatDuration, getDuration } from "./date-utils";
import { round } from "./generic-utils";
import { getInvoiceFileName } from "./invoice-utils";
import { getNonLabourTravelCode } from "./support-item-utils";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
dayjs.extend(timezone);

import "@/fonts/Inter-normal";
import { parseInvoice } from "@/server/api/routers/invoice-router";

const generatePDF = async (invoiceId: string) => {
	const client = await prisma.invoice
		.findUnique({
			where: { id: invoiceId },
		})
		.client({ select: { id: true } });

	if (!client) return { pdfString: "", fileName: null };

	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId },
		include: {
			client: true,
			activities: {
				include: {
					supportItem: {
						include: {
							supportItemRates: { where: { clientId: client.id } },
						},
					},
				},
			},
		},
	});

	if (!invoice || !invoice.client || !invoice.activities)
		return { pdfString: "", fileName: null };

	const margin = 20;

	const document_ = new jspdf();

	document_.setFont("Inter");

	document_.setFontSize(20);
	document_.text("Tax Invoice", 150, margin);

	document_.setFontSize(10);

	// Write details at top of page
	const invoiceDetails: string[] = [
		`Invoice Number: ${invoice.invoiceNo}`,
		`Invoice Date: ${dayjs(invoice.date).format("DD/MM/YY")}`,
		`Participant Name: ${invoice.client?.name}`,
	];
	if (invoice.client?.number)
		invoiceDetails.push(`Participant Number: ${invoice.client?.number}`);
	if (invoice.billTo) invoiceDetails.push(`Bill To: ${invoice.billTo}`);

	for (const [index, detail] of invoiceDetails.entries()) {
		document_.text(detail, margin, margin + index * 5);
	}

	let activityStrings: string[][] = [];

	await Promise.all(
		invoice.activities.map(async (activity) => {
			if (activity?.supportItem === null) return;

			const [itemCode, rate] = getRateForActivity(activity);

			let countString = "";
			let totalCost = 0;
			if (
				activity?.supportItem?.rateType === RateType.HOUR &&
				activity.startTime &&
				activity.endTime
			) {
				const duration = getDuration(activity.startTime, activity.endTime);
				totalCost = round(Number(rate) * duration, 2);

				const prettyDuration = formatDuration(duration);

				countString = `${dayjs.utc(activity.startTime).format("HH:mm")}-${dayjs
					.utc(activity.endTime)
					.format("HH:mm")} (${prettyDuration})`;
			} else if (activity?.supportItem?.rateType === RateType.KM) {
				totalCost = round(Number(rate) * (activity.itemDistance || 0), 2);

				countString = `${activity.itemDistance?.toString()} km`;
			}

			const currentActivity = [
				`${activity.supportItem.description}\n${itemCode}\n`,
				`${dayjs.utc(activity.date).format("DD/MM/YY")}\n`,
				`${countString}\n`,
				`$${rate?.toFixed(2)}${`/${
					activity.supportItem.rateType === RateType.HOUR ? "hr" : "km"
				}`}\n`,
				`$${totalCost.toFixed(2)}\n`,
			];

			activityStrings.push(currentActivity);

			// Provider Travel - Labour Costs
			if (activity.transitDuration) {
				const travelTotal = round(
					(Number(rate) / 60) * Number(activity.transitDuration),
					2
				);

				activityStrings.push([
					`Provider Travel - Labour Costs\n${itemCode}\n`,
					`${dayjs.utc(activity.date).format("DD/MM/YY")}\n`,
					`${activity.transitDuration} minutes\n`,
					`$${rate.toFixed(2)}${`/${
						activity.supportItem.rateType === RateType.HOUR ? "hr" : "km"
					}`}\n`,
					`$${travelTotal.toFixed(2)}\n`,
				]);
			}

			// Provider Travel - Non Labour Costs
			if (activity.transitDistance) {
				// TODO: Handle groups other than 2 clients
				const isGroup =
					activity.supportItem.description.includes("Group Activities");
				const ratePerKm = isGroup ? 0.43 : 0.85;
				const travelTotal = ratePerKm * Number(activity.transitDistance);

				const supportItemCode = getNonLabourTravelCode(
					activity.supportItem.weekdayCode
				);

				activityStrings.push([
					`Provider Travel - Non Labour Costs\n${supportItemCode ?? ""}\n`,
					`${dayjs.utc(activity.date).format("DD/MM/YY")}\n`,
					`${activity.transitDistance} km\n`,
					`\$${ratePerKm}/km\n`,
					`$${travelTotal.toFixed(2)}\n`,
				]);
			}
		})
	);

	// Sort activities based on description
	activityStrings.sort((a, b) => {
		if (a[0] > b[0]) return 1;
		if (a[0] < b[0]) return -1;

		return 0;
	});

	// Combine multiple of the same activitiy
	let lastIndex = 0;
	activityStrings.map((activity, index) => {
		if (activity[0] === activityStrings[lastIndex][0] && index !== 0) {
			activity[0] = "";
			activityStrings[lastIndex][1] += `${activity[1]}`;
			activityStrings[lastIndex][2] += `${activity[2]}`;
			activityStrings[lastIndex][3] += `${activity[3]}`;
			activityStrings[lastIndex][4] += `${activity[4]}`;
		} else {
			lastIndex = index;
		}

		return activity;
	});

	// Remove the leftover activities after they've been grouped together
	activityStrings = activityStrings.filter((activity) => activity[0] !== "");

	// Activities only allows strings - need to allow strings and CellDef
	const values: (CellDef | string)[][] = activityStrings;

	const totalCost = getTotalCostOfActivities(invoice.activities);

	// Bottom section
	values.push(
		[
			{
				content: "Total",
				colSpan: 4,
				styles: { fontStyle: "bold", halign: "right" },
			},
			{
				content: `$${totalCost.toFixed(2)}`,
				styles: { fontStyle: "bold" },
			},
		],
		[{ content: "", colSpan: 5, styles: { fillColor: "#fff" } }]
	);

	const user = await prisma.user.findUnique({ where: { id: invoice.ownerId } });

	if (user) {
		const content = [
			user.name ?? "",
			user.abn
				? `ABN: ${user.abn.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, " ")}`
				: "",
			user.bankName ? `Bank: ${user.bankName}` : "",
			user.bsb
				? `BSB: ${user.bsb.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, "-")}`
				: "",
			user.bankNumber
				? `Account Number: ${user.bankNumber
						?.toString()
						.replaceAll(/\B(?=(\d{3})+(?!\d))/g, " ")}`
				: "",
		].filter((val) => val.length > 0);

		if (content.length === 5) {
			values.push([
				{
					content: content.join("\n"),
					colSpan: 5,
					rowSpan: 2,
					styles: {
						minCellHeight: 46,
						halign: "left",
						fillColor: "#FFF",
						fontStyle: "bold",
						lineWidth: 0.2,
						lineColor: "#000",
					},
				},
			]);
		}
	}

	const startY =
		35 + (invoice.billTo ? 5 : 0) + (invoice.client?.number ? 5 : 0);

	autoTable(document_, {
		head: [
			[
				"Description",
				"Date",
				"Count",
				{ content: "Unit Price", styles: { halign: "right" } },
				"Total",
			],
		],
		body: values,
		startY: startY,
		margin,
		theme: "striped",
		headStyles: {
			lineColor: "#000",
			fillColor: "#FFF",
			textColor: "#000",
		},
		bodyStyles: {
			textColor: "#000",
		},
		columnStyles: {
			0: {
				cellWidth: 50,
				fontStyle: "bold",
			},
			1: {
				cellWidth: 20,
			},
			3: {
				cellWidth: 20,
				halign: "right",
			},
		},
	});

	const fileName = getInvoiceFileName(parseInvoice(invoice));

	return {
		pdfString: document_
			.output("dataurlstring")
			.replace(/^data:application\/pdf;filename=.+\.pdf;base64,/, ""),
		fileName,
	};
};

export default generatePDF;
