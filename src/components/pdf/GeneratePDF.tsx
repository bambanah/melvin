import jsPDF from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import React from "react";
import { getActivities } from "../../services/firebase";
import { ActivityObject, Invoice } from "../../types";
import { formatDate } from "../../services/helpers";

export default function GeneratePDF({ invoice }: { invoice: Invoice }) {
	const generatePDF = () => {
		const margin = 15;

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

				if (activityDetails[activityId].rate_type === "hr") {
					totalCost = activityDetails[activityId].rate * activity.duration;
				} else {
					totalCost =
						activityDetails[activityId].rate * parseInt(activity.distance);
				}

				sumTotal += totalCost;

				let activityString: string[] = [
					activity.date,
					`${activityDetails[activityId].description}\n${activityId}`,
					`$${activityDetails[activityId].rate}\n/${activityDetails[activityId].rate_type}`,
					activity.duration
						? activity.duration.toString()
						: activity.distance.toString(),
					`$${totalCost.toFixed(2)}`,
				];

				activities.push(activityString);
			});

			activities.push(["", "", "", "Total", `$${sumTotal.toFixed(2)}`]);
			activities.push([
				{
					content:
						"Phoebe Nicholas\nABN: 71 105 617 976\nBank: Up\nBSB: 633 123\nAccount Number: 177 757 663",
					colSpan: 5,
					rowSpan: 2,
					styles: { halign: "left" },
				},
			]);

			autoTable(doc, {
				head: [["Date", "Description", "Rate", "Count", "Total"]],
				body: activities,
				startY: 40,
				theme: "plain",
			});

			doc.save();
		});
	};

	return (
		<div>
			<button onClick={generatePDF} className="button">
				Generate PDF
			</button>
		</div>
	);
}
