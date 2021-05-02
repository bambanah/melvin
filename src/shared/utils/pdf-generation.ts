import jsPDF from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import { getActivities } from "./firebase";
import { ActivityObject, Invoice } from "../../types";
import { formatDate, getPrettyDuration } from "./helpers";

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
		`Client Name: ${invoice.client_name}`,
		`Client Number: ${invoice.client_no}`,
		`Bill To: ${invoice.bill_to}`,
		`Invoice Number: ${invoice.invoice_no}`,
	];
	invoiceDetails.forEach((detail, index) => {
		doc.text(detail, margin, margin + index * 5);
	});

	// Write activity table
	getActivities().then((activityDetails: ActivityObject) => {
		const activities: (string | CellDef)[][] = [];
		let sumTotal = 0;

		// Sort invoice based on activity
		invoice.activities.sort((a, b) => {
			if (a.activity_ref > b.activity_ref) return 1;
			if (b.activity_ref > a.activity_ref) return -1;
			return 0;
		});

		let lastActivityId = "";
		let currentActivity = ["", "", "", "", ""];

		invoice.activities.forEach((activity) => {
			const activityId = activity.activity_ref.split("/")[1];

			const isNewActivity = lastActivityId !== activityId;

			if (isNewActivity && lastActivityId !== "") {
				activities.push(currentActivity);
				currentActivity = ["", "", "", "", ""];
			}

			let totalCost = 0;
			let countString = "";

			if (activityDetails[activityId].rate_type === "hr") {
				totalCost = activityDetails[activityId].rate * activity.duration;

				const prettyDuration = getPrettyDuration(activity.duration);

				countString = `${activity.start_time?.toLowerCase()}-${activity.end_time?.toLowerCase()} (${prettyDuration})`;
			} else if (activityDetails[activityId].rate_type === "km") {
				totalCost =
					activityDetails[activityId].rate * parseInt(activity.distance, 10);

				countString = `${activity.distance} kilometres`;
			} else if (activityDetails[activityId].rate_type === "minutes") {
				totalCost = activityDetails[activityId].rate * (activity.duration / 60);
				countString = `${activity.duration} minutes`;
			}

			sumTotal += totalCost;

			currentActivity[0] += isNewActivity
				? `${activityDetails[activityId].description}\n${activityId}\n`
				: "";
			currentActivity[1] += `${activity.date}\n`;
			currentActivity[2] += `${countString}\n`;
			currentActivity[3] += `$${activityDetails[activityId].rate}/${
				activityDetails[activityId].rate_type === "minutes"
					? "hr"
					: activityDetails[activityId].rate_type
			}\n`;
			currentActivity[4] += `$${totalCost.toFixed(2)}\n`;

			lastActivityId = activityId;
		});

		// Push last activity
		activities.push(currentActivity);

		// Bottom section
		activities.push([
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
		activities.push([
			{ content: "", colSpan: 5, styles: { fillColor: "#fff" } },
		]);
		activities.push([
			{
				content:
					"Phoebe Nicholas\nABN: 71 105 617 976\nBank: Up\nBSB: 633 123\nAccount Number: 177 757 663",
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
					{ content: "Rate", styles: { halign: "right" } },
					"Total",
				],
			],
			body: activities,
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

		doc.save();
	});
};

export default generatePDF;
