import prisma from "@/server/prisma";
import { RateType, type User } from "@/generated/client";
import jspdf from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import {
	type BillableActivity,
	type BillableLine,
	billableLines
} from "./billing-lines";
import { formatDuration } from "./date-utils";
import { round } from "./generic-utils";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
dayjs.extend(timezone);

// import "@/fonts/Inter-normal";

export interface InvoicePdfData {
	invoice: {
		invoiceNo: string;
		date: Date;
		billTo?: string | null;
		client: { name: string; number?: string | null } | null;
		activities: BillableActivity[];
		ownerId: string;
	};
	user: Pick<User, "name" | "abn" | "bankName" | "bsb" | "bankNumber"> | null;
	rateContext: { userTransitRatePerKm: number };
}

export const loadInvoiceForPdf = async (
	invoiceId: string,
	ownerId: string
): Promise<InvoicePdfData | null> => {
	const invoiceRecord = await prisma.invoice.findFirst({
		where: { id: invoiceId, ownerId },
		select: { clientId: true }
	});

	if (!invoiceRecord?.clientId) return null;

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

	if (!invoice || !invoice.client || !invoice.activities) return null;

	const user = await prisma.user.findUnique({ where: { id: invoice.ownerId } });

	return {
		invoice,
		user,
		rateContext: {
			userTransitRatePerKm: Number(user?.transitRatePerKm ?? 0.99)
		}
	};
};

/** The Details-column cell for a line, plus its Unit Price suffix. */
const formatLine = (
	line: BillableLine,
	activity: BillableActivity
): string[] => {
	const dateCell = `${dayjs.utc(line.serviceDate).format("DD/MM/YY")}\n`;
	const descriptionCell = `${line.description}\n${line.supportItemCode}\n`;
	const totalCell = `$${line.total.toFixed(2)}\n`;

	switch (line.kind) {
		case "SUPPORT": {
			if (line.unit === "HOUR") {
				const detailsCell = `${dayjs
					.utc(activity.startTime ?? undefined)
					.format("HH:mm")}-${dayjs
					.utc(activity.endTime ?? undefined)
					.format("HH:mm")} (${formatDuration(line.quantity)})\n`;

				return [
					descriptionCell,
					dateCell,
					detailsCell,
					`$${line.unitPrice.toFixed(2)}/hr\n`,
					totalCell
				];
			}

			return [
				descriptionCell,
				dateCell,
				`${line.quantity} km\n`,
				`$${line.unitPrice.toFixed(2)}/km\n`,
				totalCell
			];
		}
		case "TRAVEL_TIME": {
			// Matches the printed unit-price suffix historically: it follows the
			// activity's own rateType, not this line's unit (docs/plans/007).
			const suffix =
				activity.supportItem.rateType === RateType.HOUR ? "hr" : "km";

			return [
				descriptionCell,
				dateCell,
				`${line.quantity} minutes\n`,
				`$${line.unitPrice.toFixed(2)}/${suffix}\n`,
				totalCell
			];
		}
		case "TRAVEL_KM":
		case "ABT": {
			return [
				descriptionCell,
				dateCell,
				`${line.quantity} km\n`,
				`$${line.unitPrice.toFixed(2)}/km\n`,
				totalCell
			];
		}
		case "EXPENSE": {
			const typeLabels: Record<string, string> = {
				PARKING: "Parking",
				TOLL: "Toll",
				OTHER: "Other Transport Expense"
			};
			const label =
				typeLabels[line.transportType ?? ""] ?? line.transportType ?? "";

			return [
				descriptionCell,
				dateCell,
				`${label}${line.note ? ` - ${line.note}` : ""}\n`,
				`-\n`,
				totalCell
			];
		}
	}
};

export const renderInvoicePdf = (
	data: InvoicePdfData
): { pdfString: string; fileName: string } => {
	const { invoice, user, rateContext } = data;

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

	interface Row {
		key: string;
		cells: string[];
	}

	const rows: Row[] = [];
	const allLines: BillableLine[] = [];

	for (const activity of invoice.activities) {
		if (activity?.supportItem === null) continue;

		const lines = billableLines(activity, rateContext);
		allLines.push(...lines);

		for (const line of lines) {
			rows.push({
				// ABT and EXPENSE lines for the same activity share one printed
				// "Activity Based Transport" row (see formatLine), so the merge
				// key is the description cell's content, not the line's kind.
				key: `${line.supportItemCode}::${line.description}`,
				cells: formatLine(line, activity)
			});
		}
	}

	// Sort rows based on description
	rows.sort((a, b) => {
		if (a.cells[0] > b.cells[0]) return 1;
		if (a.cells[0] < b.cells[0]) return -1;

		return 0;
	});

	// Combine multiple of the same activity
	let lastIndex = 0;
	rows.forEach((row, index) => {
		if (index !== 0 && row.key === rows[lastIndex].key) {
			for (let column = 1; column <= 4; column++) {
				rows[lastIndex].cells[column] += row.cells[column];
			}
			row.cells[0] = "";
		} else {
			lastIndex = index;
		}
	});

	// Remove the leftover rows after they've been grouped together
	const activityStrings: string[][] = rows
		.filter((row) => row.cells[0] !== "")
		.map((row) => row.cells);

	// Activities only allows strings - need to allow strings and CellDef
	const values: (CellDef | string)[][] = activityStrings;

	const grandTotal = round(
		allLines.reduce((total, line) => total + line.total, 0),
		2
	);

	// Bottom section
	values.push(
		[
			{
				content: "Total",
				colSpan: 4,
				styles: { fontStyle: "bold", halign: "right" }
			},
			{
				content: `$${grandTotal.toFixed(2)}`,
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

const generatePDF = async (invoiceId: string, ownerId: string) => {
	const data = await loadInvoiceForPdf(invoiceId, ownerId);

	if (!data) return { pdfString: "", fileName: null };

	return renderInvoicePdf(data);
};

export default generatePDF;
