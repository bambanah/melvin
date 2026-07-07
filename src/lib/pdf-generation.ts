import prisma from "@/server/prisma";
import { RateType } from "@/generated/client";
import jspdf from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import {
	getRateForActivity,
	getTotalCostOfActivities,
	getTransitRate
} from "./activity-utils";
import { formatDuration, getDuration } from "./date-utils";
import { round } from "./generic-utils";
import {
	getActivityBasedTransportCode,
	getNonLabourTravelCode
} from "./support-item-utils";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
dayjs.extend(timezone);

// import "@/fonts/Inter-normal";

const generatePDF = async (invoiceId: string, ownerId: string) => {
	const invoiceRecord = await prisma.invoice.findFirst({
		where: { id: invoiceId, ownerId },
		select: { clientId: true }
	});

	if (!invoiceRecord?.clientId) return { pdfString: "", fileName: null };

	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId, ownerId },
		include: {
			client: true,
			activities: {
				include: {
					supportItem: {
						include: {
							supportItemRates: { where: { clientId: invoiceRecord.clientId } }
						}
					},
					transportItems: true,
					client: { select: { transitRatePerKm: true } }
				}
			}
		}
	});

	if (!invoice || !invoice.client || !invoice.activities)
		return { pdfString: "", fileName: null };

	const user = await prisma.user.findUnique({ where: { id: invoice.ownerId } });

	const rateContext = {
		userTransitRatePerKm: Number(user?.transitRatePerKm ?? 0.99)
	};

	const margin = 20;

	const document_ = new jspdf();

	// document_.setFont("Inter");

	document_.setFontSize(20);
	document_.text("Tax Invoice", 150, margin);

	document_.setFontSize(10);

	// Write details at top of page
	const invoiceDetails: string[] = [
		`Invoice Number: ${invoice.invoiceNo}`,
		`Invoice Date: ${dayjs(invoice.date).format("DD/MM/YY")}`,
		`Participant Name: ${invoice.client?.name}`
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
				`$${totalCost.toFixed(2)}\n`
			];

			activityStrings.push(currentActivity);

			// Provider Travel - Labour Costs
			if (activity.transitDuration) {
				const travelTotal = round(
					(Number(rate) / 60) * Number(activity.transitDuration),
					2
				);

				activityStrings.push([
					`Provider travel - labour costs\n${itemCode}\n`,
					`${dayjs.utc(activity.date).format("DD/MM/YY")}\n`,
					`${activity.transitDuration} minutes\n`,
					`$${rate.toFixed(2)}${`/${
						activity.supportItem.rateType === RateType.HOUR ? "hr" : "km"
					}`}\n`,
					`$${travelTotal.toFixed(2)}\n`
				]);
			}

			// Provider Travel - Non Labour Costs
			if (activity.transitDistance) {
				const ratePerKm = getTransitRate(activity, rateContext);
				const travelTotal = ratePerKm * Number(activity.transitDistance);

				const supportItemCode = getNonLabourTravelCode(
					activity.supportItem.weekdayCode
				);

				activityStrings.push([
					`Provider travel - non-labour costs\n${supportItemCode ?? ""}\n`,
					`${dayjs.utc(activity.date).format("DD/MM/YY")}\n`,
					`${activity.transitDistance} km\n`,
					`$${ratePerKm.toFixed(2)}/km\n`,
					`$${travelTotal.toFixed(2)}\n`
				]);
			}

			// Activity Based Transport items
			if (activity.transportItems && activity.transportItems.length > 0) {
				const isGroupActivity = activity.supportItem.isGroup;
				const activityTransportRate = isGroupActivity ? 0.49 : 0.99;

				const transportCode = getActivityBasedTransportCode(
					activity.supportItem.weekdayCode
				);
				// "Activity Based Transport" is the price guide's name for this code;
				// the expense type (parking, toll, …) prints in the Details column
				const transportDescription = `Activity Based Transport\n${transportCode}\n`;

				for (const transportItem of activity.transportItems) {
					if (transportItem.type === "DISTANCE") {
						const transportTotal = round(
							Number(transportItem.amount) * activityTransportRate,
							2
						);
						activityStrings.push([
							transportDescription,
							`${dayjs.utc(activity.date).format("DD/MM/YY")}\n`,
							`${transportItem.amount} km\n`,
							`$${activityTransportRate.toFixed(2)}/km\n`,
							`$${transportTotal.toFixed(2)}\n`
						]);
					} else {
						const typeLabels: Record<string, string> = {
							PARKING: "Parking",
							TOLL: "Toll",
							OTHER: "Other Transport Expense"
						};
						const label = typeLabels[transportItem.type] || transportItem.type;
						const amount = Number(transportItem.amount);

						activityStrings.push([
							transportDescription,
							`${dayjs.utc(activity.date).format("DD/MM/YY")}\n`,
							`${label}${transportItem.note ? ` - ${transportItem.note}` : ""}\n`,
							`-\n`,
							`$${amount.toFixed(2)}\n`
						]);
					}
				}
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

	const totalCost = getTotalCostOfActivities(invoice.activities, rateContext);

	// Bottom section
	values.push(
		[
			{
				content: "Total",
				colSpan: 4,
				styles: { fontStyle: "bold", halign: "right" }
			},
			{
				content: `$${totalCost.toFixed(2)}`,
				styles: { fontStyle: "bold" }
			}
		],
		[{ content: "", colSpan: 5, styles: { fillColor: "#fff" } }]
	);

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
				: ""
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
						lineColor: "#000"
					}
				}
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
				"Details",
				{ content: "Unit Price", styles: { halign: "right" } },
				"Total"
			]
		],
		body: values,
		startY: startY,
		margin,
		theme: "striped",
		headStyles: {
			lineColor: "#000",
			fillColor: "#FFF",
			textColor: "#000"
		},
		bodyStyles: {
			textColor: "#000"
		},
		columnStyles: {
			0: {
				cellWidth: 50,
				fontStyle: "bold"
			},
			1: {
				cellWidth: 20
			},
			3: {
				cellWidth: 20,
				halign: "right"
			}
		}
	});

	const fileName = `${invoice.invoiceNo}.pdf`;

	return {
		pdfString: document_
			.output("dataurlstring")
			.replace(/^data:application\/pdf;filename=.+\.pdf;base64,/, ""),
		fileName
	};
};

export default generatePDF;
