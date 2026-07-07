import prisma from "@/server/prisma";
import type { Prisma, User } from "@/generated/client";
import jspdf from "jspdf";
import autoTable, { CellDef } from "jspdf-autotable";
import {
	type BillableActivity,
	billableLines,
	lineDetailsText,
	lineUnitPriceSuffix
} from "./billing-lines";
import { formatProviderDetails, type ProviderDetails } from "./invoice-version";
import { round } from "./generic-utils";
import {
	invoiceVersionContentSchema,
	type InvoiceVersionContent,
	type UnitPriceSuffix
} from "@/schema/invoice-version-schema";

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

/** The subset of a Prisma client/transaction client the loader needs. */
type PdfPrismaClient = Pick<Prisma.TransactionClient, "invoice" | "user">;

export const loadInvoiceForPdf = async (
	invoiceId: string,
	ownerId: string,
	client: PdfPrismaClient = prisma
): Promise<InvoicePdfData | null> => {
	const invoiceRecord = await client.invoice.findFirst({
		where: { id: invoiceId, ownerId },
		select: { clientId: true }
	});

	if (!invoiceRecord?.clientId) return null;

	const invoice = await client.invoice.findFirst({
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

	const user = await client.user.findUnique({ where: { id: invoice.ownerId } });

	return {
		invoice,
		user,
		rateContext: {
			userTransitRatePerKm: Number(user?.transitRatePerKm ?? 0.99)
		}
	};
};

/**
 * A single printed table row's worth of data, already resolved to exactly
 * what's printed — no `kind`-specific branching left to do, and no live
 * `Activity` reference needed. Both rendering sources (live activities via
 * plan 007's `billableLines`, and a frozen `InvoiceVersion.content`) build
 * this shape so the drawing code below is source-agnostic (docs/plans/017
 * Step 6).
 */
interface PdfLine {
	description: string;
	supportItemCode: string;
	serviceDate: Date | string;
	total: number;
	unitPrice: number;
	unitPriceSuffix?: UnitPriceSuffix;
	detailsText: string;
}

/** The Details-column cell for a line, plus its Unit Price column. */
const formatPdfLine = (line: PdfLine): string[] => {
	const dateCell = `${dayjs.utc(line.serviceDate).format("DD/MM/YY")}\n`;
	const descriptionCell = `${line.description}\n${line.supportItemCode}\n`;
	const totalCell = `$${line.total.toFixed(2)}\n`;
	const detailsCell = `${line.detailsText}\n`;
	const unitPriceCell = line.unitPriceSuffix
		? `$${line.unitPrice.toFixed(2)}/${line.unitPriceSuffix}\n`
		: `-\n`;

	return [descriptionCell, dateCell, detailsCell, unitPriceCell, totalCell];
};

/**
 * Everything `renderFromRenderable` needs to draw a PDF — built either from
 * live `InvoicePdfData` (draft, watermarked) or a frozen
 * `InvoiceVersionContent` (clean, possibly with a supersedes line).
 */
interface RenderableInvoice {
	invoiceNoLabel: string;
	date: Date | string;
	participantName: string;
	participantNumber?: string | null;
	billTo?: string | null;
	/** The previous version's display number, printed as a supersedes line. */
	supersedesLabel?: string;
	lines: PdfLine[];
	total: number;
	provider: ProviderDetails;
	fileName: string;
	watermark?: "DRAFT";
}

const renderFromRenderable = (
	renderable: RenderableInvoice
): { pdfString: string; fileName: string } => {
	const margin = 20;

	const document_ = new jspdf();

	// document_.setFont("Inter");

	document_.setFontSize(20);
	document_.text("Tax Invoice", 150, margin);

	document_.setFontSize(10);

	// Write details at top of page
	const invoiceDetails: string[] = [
		`Invoice Number: ${renderable.invoiceNoLabel}`,
		`Invoice Date: ${dayjs(renderable.date).format("DD/MM/YY")}`,
		`Participant Name: ${renderable.participantName}`
	];
	if (renderable.participantNumber)
		invoiceDetails.push(`Participant Number: ${renderable.participantNumber}`);
	if (renderable.billTo) invoiceDetails.push(`Bill To: ${renderable.billTo}`);
	if (renderable.supersedesLabel)
		invoiceDetails.push(
			`This invoice amends and supersedes ${renderable.supersedesLabel}`
		);

	for (const [index, detail] of invoiceDetails.entries()) {
		document_.text(detail, margin, margin + index * 5);
	}

	interface Row {
		key: string;
		cells: string[];
	}

	const rows: Row[] = renderable.lines.map((line) => ({
		// ABT and EXPENSE lines for the same activity share one printed
		// "Activity Based Transport" row (see formatPdfLine), so the merge
		// key is the description cell's content, not the line's kind.
		key: `${line.supportItemCode}::${line.description}`,
		cells: formatPdfLine(line)
	}));

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

	// Bottom section
	values.push(
		[
			{
				content: "Total",
				colSpan: 4,
				styles: { fontStyle: "bold", halign: "right" }
			},
			{
				content: `$${renderable.total.toFixed(2)}`,
				styles: { fontStyle: "bold" }
			}
		],
		[{ content: "", colSpan: 5, styles: { fillColor: "#fff" } }]
	);

	const providerLines = [
		renderable.provider.name ?? "",
		renderable.provider.abn ? `ABN: ${renderable.provider.abn}` : "",
		renderable.provider.bankName ? `Bank: ${renderable.provider.bankName}` : "",
		renderable.provider.bsb ? `BSB: ${renderable.provider.bsb}` : "",
		renderable.provider.accountNumber
			? `Account Number: ${renderable.provider.accountNumber}`
			: ""
	].filter((val) => val.length > 0);

	if (providerLines.length === 5) {
		values.push([
			{
				content: providerLines.join("\n"),
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

	const startY =
		35 +
		(renderable.billTo ? 5 : 0) +
		(renderable.participantNumber ? 5 : 0) +
		(renderable.supersedesLabel ? 5 : 0);

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

	if (renderable.watermark === "DRAFT") {
		document_.saveGraphicsState();
		document_.setGState(document_.GState({ opacity: 0.15 }));
		document_.setFontSize(80);
		document_.setTextColor(150, 150, 150);
		document_.text("DRAFT", 105, 180, { angle: 45, align: "center" });
		document_.restoreGraphicsState();
	}

	return {
		pdfString: document_
			.output("dataurlstring")
			.replace(/^data:application\/pdf;filename=.+\.pdf;base64,/, ""),
		fileName: renderable.fileName
	};
};

/** Renders live data — used only for drafts, so callers should pass `draftWatermark: true`. */
export const renderInvoicePdf = (
	data: InvoicePdfData,
	options: { draftWatermark?: boolean } = {}
): { pdfString: string; fileName: string } => {
	const { invoice, user, rateContext } = data;

	const lines: PdfLine[] = [];

	for (const activity of invoice.activities) {
		if (activity?.supportItem === null) continue;

		for (const line of billableLines(activity, rateContext)) {
			lines.push({
				description: line.description,
				supportItemCode: line.supportItemCode,
				serviceDate: line.serviceDate,
				total: line.total,
				unitPrice: line.unitPrice,
				unitPriceSuffix: lineUnitPriceSuffix(line, activity),
				detailsText: lineDetailsText(line, activity)
			});
		}
	}

	const total = round(
		lines.reduce((sum, line) => sum + line.total, 0),
		2
	);

	return renderFromRenderable({
		invoiceNoLabel: invoice.invoiceNo,
		date: invoice.date,
		participantName: invoice.client?.name ?? "",
		participantNumber: invoice.client?.number,
		billTo: invoice.billTo,
		lines,
		total,
		provider: formatProviderDetails(user),
		fileName: `${invoice.invoiceNo}.pdf`,
		watermark: options.draftWatermark ? "DRAFT" : undefined
	});
};

/**
 * Renders a frozen `InvoiceVersion.content` document — no live reads, so a
 * sent/paid invoice's clean PDF renders byte-identically no matter what
 * changes upstream afterwards (docs/plans/017 Step 6).
 */
export const renderInvoiceVersionPdf = (
	content: InvoiceVersionContent
): { pdfString: string; fileName: string } =>
	renderFromRenderable({
		invoiceNoLabel: content.header.displayInvoiceNo,
		date: content.header.date,
		participantName: content.header.participantName,
		participantNumber: content.header.participantNumber,
		billTo: content.header.billTo,
		supersedesLabel: content.header.amendsDisplayInvoiceNo,
		lines: content.lines,
		total: content.total,
		provider: content.provider,
		fileName: `${content.header.displayInvoiceNo}.pdf`
	});

export interface GeneratePdfOptions {
	/** Render this specific version instead of resolving by invoice status. */
	versionNumber?: number;
}

/**
 * Resolves which of the two data sources above to render from
 * (docs/plans/017 Step 6): an explicit version number always wins; failing
 * that, a locked (non-draft) invoice renders its latest version; a draft
 * invoice renders live data with the DRAFT watermark.
 */
const generatePDF = async (
	invoiceId: string,
	ownerId: string,
	options: GeneratePdfOptions = {}
): Promise<{ pdfString: string; fileName: string | null }> => {
	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId, ownerId },
		select: { status: true }
	});

	if (!invoice) return { pdfString: "", fileName: null };

	if (options.versionNumber !== undefined) {
		const version = await prisma.invoiceVersion.findFirst({
			where: { invoiceId, versionNumber: options.versionNumber }
		});
		if (!version) return { pdfString: "", fileName: null };

		return renderInvoiceVersionPdf(
			invoiceVersionContentSchema.parse(version.content)
		);
	}

	if (invoice.status !== "CREATED") {
		const latestVersion = await prisma.invoiceVersion.findFirst({
			where: { invoiceId },
			orderBy: { versionNumber: "desc" }
		});
		if (!latestVersion) return { pdfString: "", fileName: null };

		return renderInvoiceVersionPdf(
			invoiceVersionContentSchema.parse(latestVersion.content)
		);
	}

	const data = await loadInvoiceForPdf(invoiceId, ownerId);

	if (!data) return { pdfString: "", fileName: null };

	return renderInvoicePdf(data, { draftWatermark: true });
};

export default generatePDF;
