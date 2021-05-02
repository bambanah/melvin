import jsPDF from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import { getActivities } from "../../shared/utils/firebase";
import { ActivityObject, Invoice } from "../../types";
import { formatDate, getPrettyDuration } from "../../shared/utils/helpers";

export const generatePDF = (invoice: Invoice) => {
	const margin = 20;

	var doc = new jsPDF();
	doc.setFontSize(20);
	doc.text("Tax Invoice", 150, margin);

	doc.setFontSize(10);

	const date = formatDate(invoice.date);

	// Write details at top of page
	const invoiceDetails = [
		`Date: ${date}`,
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
		let activities: (string | CellDef)[][] = [];
		let sumTotal = 0;

		invoice.activities.forEach((activity, index) => {
			const activityId = activity.activity_ref.split("/")[1];

			let totalCost = 0;
			let countString = "";

			if (activityDetails[activityId].rate_type === "hr") {
				totalCost = activityDetails[activityId].rate * activity.duration;

				const prettyDuration = getPrettyDuration(activity.duration);

				countString = `${activity.start_time?.toLowerCase()}-${activity.end_time?.toLowerCase()}\n(${prettyDuration})`;
			} else if (activityDetails[activityId].rate_type === "km") {
				totalCost =
					activityDetails[activityId].rate * parseInt(activity.distance);

				countString = `${activity.distance} km`;
			} else if (activityDetails[activityId].rate_type === "minutes") {
				totalCost = activityDetails[activityId].rate * (activity.duration / 60);
				countString = `${activity.duration} minutes`;
			}

			sumTotal += totalCost;

			let activityStrings: string[] = [
				`${activityDetails[activityId].description}\n${activityId}`,
				activity.date,
				countString,
				`$${activityDetails[activityId].rate}\n/${
					activityDetails[activityId].rate_type === "minutes"
						? "hr"
						: activityDetails[activityId].rate_type
				}`,
				`$${totalCost.toFixed(2)}`,
			];

			const activityRow = activityStrings.map((activityString) => {
				return {
					content: activityString,
					// styles: { fontStyle: activityString === "" },
				};
			});

			activities.push(activityRow);
		});

		activities.push(["", "", "", "Total", `$${sumTotal.toFixed(2)}`]);
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
					fontStyle: "normal",
					lineWidth: 0.2,
					lineColor: "#000",
				},
			},
		]);

		autoTable(doc, {
			head: [["Description", "Date", "Count", "Rate", "Total"]],
			body: activities,
			startY: 45,
			margin: margin,
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
					cellWidth: 40,
					fontStyle: "bold",
				},
				2: {
					cellWidth: 40,
				},
			},
		});

		doc.save();
	});
};
