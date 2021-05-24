import jsPDF from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import { getActivities } from "./firebase";
import { ActivityObject, Invoice } from "../types";
import { formatDate, getPrettyDuration, getRate } from "./helpers";

const generatePDF = (invoice: Invoice) => {
	const margin = 20;

	// eslint-disable-next-line new-cap
	const doc = new jsPDF();

	doc.setFontSize(20);
	doc.text("Tax Invoice", 150, margin);

	doc.setFontSize(10);

	const date = formatDate(invoice.date);

	// Write details at top of page
	const invoiceDetails = [
		`Invoice Date: ${date}`,
		`Participant Name: ${invoice.client_name}`,
		`Participant Number: ${invoice.client_no}`,
		`Bill To: ${invoice.bill_to}`,
		`Invoice Number: ${invoice.invoice_no}`,
	];
	invoiceDetails.forEach((detail, index) => {
		doc.text(detail, margin, margin + index * 5);
	});

	// Write activity table
	getActivities().then(async (activityDetails: ActivityObject) => {
		let activities: string[][] = [];
		let sumTotal = 0;

		await Promise.all(
			invoice.activities.map(async (activity) => {
				const activityId = activity.activity_ref.split("/")[1];

				let totalCost = 0;
				let countString = "";

				await getRate(activity).then(({ rate, itemCode }) => {
					if (rate) {
						if (activityDetails[activityId].rate_type === "hr") {
							totalCost = rate * activity.duration;

							const prettyDuration = getPrettyDuration(activity.duration);

							countString = `${activity.start_time?.toLowerCase()}-${activity.end_time?.toLowerCase()} (${prettyDuration})`;
						} else if (activityDetails[activityId].rate_type === "km") {
							totalCost = rate * parseInt(activity.distance, 10);

							countString = `${activity.distance} kilometres`;
						}
					}

					sumTotal += totalCost;

					const currentActivity = [];

					currentActivity.push(
						`${activityDetails[activityId].description}\n${itemCode}\n`
					);
					currentActivity.push(`${activity.date}\n`);
					currentActivity.push(`${countString}\n`);
					currentActivity.push(
						`$${rate?.toFixed(
							2
						)}${`/${activityDetails[activityId].rate_type}`}\n`
					);
					currentActivity.push(`$${totalCost.toFixed(2)}\n`);

					activities.push(currentActivity);

					// Provider Travel
					if (activity.travel_duration > 0 && rate) {
						const providerTravel = [];

						const travelTotal = (rate / 60) * activity.travel_duration;

						providerTravel.push(`Provider Travel\n${itemCode}\n`);
						providerTravel.push(`${activity.date}\n`);
						providerTravel.push(`${activity.travel_duration} minutes\n`);
						providerTravel.push(
							`$${rate.toFixed(
								2
							)}${`/${activityDetails[activityId].rate_type}`}\n`
						);
						providerTravel.push(`$${travelTotal.toFixed(2)}\n`);

						activities.push(providerTravel);

						sumTotal += travelTotal;
					}

					// Provider Travel - Non Labour Costs
					if (activity.travel_distance > 0) {
						const providerTravel = [];

						const travelTotal = 0.85 * activity.travel_distance;

						providerTravel.push(
							`Provider Travel - Non Labour Costs\n${itemCode}\n`
						);
						providerTravel.push(`${activity.date}\n`);
						providerTravel.push(`${activity.travel_distance} km\n`);
						providerTravel.push("$0.85/km\n");
						providerTravel.push(`$${travelTotal.toFixed(2)}\n`);

						activities.push(providerTravel);

						sumTotal += travelTotal;
					}
				});
			})
		);

		// Sort activities based on description
		activities.sort((a, b) => {
			if (a[0] > b[0]) return 1;
			if (a[0] < b[0]) return -1;

			return 0;
		});

		// Combine multiple of the same activitiy
		let lastIndex = 0;
		activities.map((activity, index) => {
			if (activity[0] === activities[lastIndex][0] && index !== 0) {
				activity[0] = "";
				activities[lastIndex][1] += `${activity[1]}`;
				activities[lastIndex][2] += `${activity[2]}`;
				activities[lastIndex][3] += `${activity[3]}`;
				activities[lastIndex][4] += `${activity[4]}`;
			} else {
				lastIndex = index;
			}

			return activity;
		});

		// Remove the leftover activities after they've been grouped together
		activities = activities.filter((activity) => activity[0] !== "");

		// Activities only allows strings - need to allow strings and CellDef
		const values: (CellDef | string)[][] = activities;
		// Bottom section
		values.push([
			{
				content: "Total",
				colSpan: 4,
				styles: { fontStyle: "bold", halign: "right" },
			},
			{
				content: `$${sumTotal.toFixed(2)}`,
				styles: { fontStyle: "bold" },
			},
		]);

		// Add gap between main section and footer
		values.push([{ content: "", colSpan: 5, styles: { fillColor: "#fff" } }]);

		values.push([
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
		]);

		autoTable(doc, {
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
					cellWidth: 20,
				},
				3: {
					cellWidth: 20,
					halign: "right",
				},
			},
		});

		const filename = `${invoice.invoice_no}-${date}`;
		doc.save(filename);
	});
};

export default generatePDF;
