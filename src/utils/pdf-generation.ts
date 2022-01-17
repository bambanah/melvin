import jspdf from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import {
	formatDate,
	getDuration,
	getPrettyDuration,
	getRate,
	getTotalCost,
} from "./helpers";
import { RateType } from "@prisma/client";
import dayjs from "dayjs";
import { Invoice } from "types/invoice";

const generatePDF = async (invoice: Invoice) => {
	const margin = 20;

	const document_ = new jspdf();

	document_.setFontSize(20);
	document_.text("Tax Invoice", 150, margin);

	document_.setFontSize(10);

	const date = formatDate(invoice.date);

	// Write details at top of page
	const invoiceDetails = [
		`Invoice Date: ${date}`,
		`Participant Name: ${invoice.client?.name}`,
		`Participant Number: ${invoice.client?.number}`,
		`Bill To: ${invoice.billTo}`,
		`Invoice Number: ${invoice.invoiceNo}`,
	];
	for (const [index, detail] of invoiceDetails.entries()) {
		document_.text(detail, margin, margin + index * 5);
	}

	let activityStrings: string[][] = [];

	await Promise.all(
		invoice.activities.map(async (activity) => {
			if (!activity || !activity.supportItem) return;

			const [itemCode, rate] = await getRate(activity);

			let countString = "";
			let totalCost = 0;
			if (activity?.supportItem?.rateType === RateType.HOUR) {
				const duration = getDuration(
					dayjs(activity.startTime).format("HH:mm"),
					dayjs(activity.endTime).format("HH:mm")
				);
				totalCost = rate * duration;

				const prettyDuration = getPrettyDuration(duration);

				countString = `${dayjs(activity.startTime).format("HH:mm")}-${dayjs(
					activity.endTime
				).format("HH:mm")} (${prettyDuration})`;
			} else if (activity?.supportItem?.rateType === RateType.KM) {
				totalCost = rate * (activity.itemDistance || 0);

				countString = `${activity.itemDistance?.toString()} kilometres`;
			}

			// Push activity
			const currentActivity = [
				`${activity.supportItem.description}\n${itemCode}\n`,
				`${formatDate(activity.date)}\n`,
				`${countString}\n`,
				`$${rate?.toFixed(2)}${`/${
					activity.supportItem.rateType === RateType.HOUR ? "hr" : "km"
				}`}\n`,
				`$${totalCost.toFixed(2)}\n`,
			];

			activityStrings.push(currentActivity);

			// Provider Travel
			if (activity.transitDuration) {
				const providerTravel = [];

				const travelTotal = (rate / 60) * activity.transitDuration;

				providerTravel.push(
					`Provider Travel\n${itemCode}\n`,
					`${formatDate(activity.date)}\n`,
					`${activity.transitDuration} minutes\n`,
					`$${rate.toFixed(2)}${`/${
						activity.supportItem.rateType === RateType.HOUR ? "hr" : "km"
					}`}\n`,
					`$${travelTotal.toFixed(2)}\n`
				);

				activityStrings.push(providerTravel);
			}

			// Provider Travel - Non Labour Costs
			if (activity.transitDistance) {
				const providerTravel = [];

				const travelTotal = 0.85 * activity.transitDistance;

				providerTravel.push(
					`Provider Travel - Non Labour Costs\n${itemCode}\n`,
					`${formatDate(activity.date)}\n`,
					`${activity.transitDistance} km\n`,
					"$0.85/km\n",
					`$${travelTotal.toFixed(2)}\n`
				);

				activityStrings.push(providerTravel);
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

	const totalCost = getTotalCost(invoice.activities);

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
		[{ content: "", colSpan: 5, styles: { fillColor: "#fff" } }],
		[
			{
				content:
					"Phoebe Nicholas\nABN: 71 105 617 976\nBank: Up Bank\nBSB: 633 123\nAccount Number: 177 757 663",
				colSpan: 5,
				rowSpan: 2,
				styles: {
					minCellHeight: 45,
					halign: "left",
					fillColor: "#FFF",
					fontStyle: "bold",
					lineWidth: 0.2,
					lineColor: "#000",
				},
			},
		]
	);

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
		startY: 45,
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
				cellWidth: 24,
			},
			3: {
				cellWidth: 20,
				halign: "right",
			},
		},
	});

	let earliestDate = invoice.activities[0].date;
	let latestDate = invoice.activities[0].date;
	for (const { date } of invoice.activities) {
		if (dayjs(date).isBefore(dayjs(earliestDate))) earliestDate = date;
		if (dayjs(date).isAfter(dayjs(latestDate))) latestDate = date;
	}

	const dateRangeFormatted = dayjs(earliestDate).isSame(latestDate)
		? dayjs(earliestDate).format("DD-MM")
		: `(${dayjs(earliestDate).format("DD-MM")})-(${dayjs(latestDate).format(
				"DD-MM"
		  )})`;

	const fileName = `${invoice.invoiceNo}_${dateRangeFormatted}-${dayjs(
		invoice.date
	).format("YYYY")}.pdf`;

	return {
		pdfString: document_
			.output("dataurlstring")
			.replace(/^data:application\/pdf;filename=.+\.pdf;base64,/, ""),
		fileName,
	};
};

export default generatePDF;
