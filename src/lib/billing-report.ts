import type { InvoiceVersionContent } from "@/schema/invoice-version-schema";
import { utcDate } from "./date-utils";
import {
	financialYearLabel,
	financialYearMonths,
	financialYearOf,
	financialYearsSpanning,
	monthIndexInFinancialYear,
	type FinancialYear
} from "./financial-year";
import { round } from "./generic-utils";

/**
 * One Sent or Paid Invoice, reduced to what the report reads: the document
 * date it is attributed by, who it billed, and its latest Invoice Version's
 * frozen content. Every figure below comes from that content - the report has
 * no live recompute path (docs/adr/0004).
 */
export interface ReportInvoice {
	date: Date | string;
	clientId: string;
	clientName: string;
	content: InvoiceVersionContent;
}

export interface FinancialYearTotal {
	financialYear: FinancialYear;
	label: string;
	total: number;
	/** The year is still running, so its total reads "to date", not final. */
	partial: boolean;
}

export interface MonthTotal {
	label: string;
	total: number;
}

export interface ClientTotal {
	clientId: string;
	clientName: string;
	total: number;
	/** Fraction of Total Billed, 0-1. */
	share: number;
}

export interface SupportItemTotal {
	supportItemCode: string;
	description: string;
	total: number;
	share: number;
}

/** The four Billing Line kinds that are not support delivery. */
export type TravelKind = "TRAVEL_TIME" | "TRAVEL_KM" | "ABT" | "EXPENSE";

export interface TravelTotal {
	kind: TravelKind;
	label: string;
	total: number;
}

export interface PreviousYearComparison {
	financialYear: FinancialYear;
	label: string;
	total: number;
	change: number;
	/** Omitted when the previous year billed nothing to divide by. */
	changeFraction?: number;
}

export interface BillingReport {
	selectedFinancialYear: FinancialYear;
	years: FinancialYearTotal[];
	totalBilled: number;
	invoiceCount: number;
	clientCount: number;
	previousYear?: PreviousYearComparison;
	months: MonthTotal[];
	clients: ClientTotal[];
	supportItems: SupportItemTotal[];
	travel: {
		rows: TravelTotal[];
		subtotal: number;
		/** Fraction of Total Billed, 0-1. */
		shareOfTotal: number;
	};
	backfilledCount: number;
}

const TRAVEL_KINDS: { kind: TravelKind; label: string }[] = [
	{ kind: "TRAVEL_TIME", label: "Provider Travel labour costs" },
	{ kind: "TRAVEL_KM", label: "Provider Travel non-labour costs" },
	{ kind: "ABT", label: "Activity Based Transport distance" },
	{ kind: "EXPENSE", label: "Transport Expenses" }
];

const money = (value: number) => round(value, 2);

const shareOf = (value: number, total: number) =>
	total === 0 ? 0 : value / total;

export interface BuildBillingReportOptions {
	/** Fixes which Financial Year is in progress. */
	today: Date;
	/** Defaults to the Financial Year in progress. */
	financialYear?: FinancialYear;
}

/**
 * The complete Reports aggregate for one Financial Year, from every Sent or
 * Paid Invoice the Provider has. Pure and synchronous - the caller does the
 * fetching.
 *
 * All years are needed, not just the selected one: the bar chart doubles as
 * the year selector and the headline figure is shown against the year before.
 */
export function buildBillingReport(
	invoices: ReportInvoice[],
	options: BuildBillingReportOptions
): BillingReport {
	const currentFinancialYear = financialYearOf(options.today);
	const selectedFinancialYear = options.financialYear ?? currentFinancialYear;

	const dated = invoices.map((invoice) => ({
		...invoice,
		date: utcDate(invoice.date),
		financialYear: financialYearOf(invoice.date)
	}));

	const totalsByYear = new Map<FinancialYear, number>();
	for (const invoice of dated) {
		totalsByYear.set(
			invoice.financialYear,
			(totalsByYear.get(invoice.financialYear) ?? 0) + invoice.content.total
		);
	}

	const years = financialYearsSpanning([
		...totalsByYear.keys(),
		currentFinancialYear,
		selectedFinancialYear
	]).map((financialYear) => ({
		financialYear,
		label: financialYearLabel(financialYear),
		total: money(totalsByYear.get(financialYear) ?? 0),
		partial: financialYear === currentFinancialYear
	}));

	const selected = dated.filter(
		(invoice) => invoice.financialYear === selectedFinancialYear
	);
	const totalBilled = money(
		selected.reduce((sum, invoice) => sum + invoice.content.total, 0)
	);

	return {
		selectedFinancialYear,
		years,
		totalBilled,
		invoiceCount: selected.length,
		clientCount: new Set(selected.map((invoice) => invoice.clientId)).size,
		previousYear: previousYearComparison(
			selectedFinancialYear,
			totalBilled,
			totalsByYear
		),
		months: monthlyTotals(selectedFinancialYear, selected),
		clients: clientTotals(selected, totalBilled),
		supportItems: supportItemTotals(selected, totalBilled),
		travel: travelTotals(selected, totalBilled),
		backfilledCount: selected.filter(
			(invoice) => invoice.content.backfilled === true
		).length
	};
}

/**
 * Absent unless something was billed before the selected year - a "down 100%"
 * against a year the Provider had not yet started trading is misleading, not
 * informative.
 */
function previousYearComparison(
	selectedFinancialYear: FinancialYear,
	totalBilled: number,
	totalsByYear: Map<FinancialYear, number>
): PreviousYearComparison | undefined {
	const hasEarlier = [...totalsByYear.keys()].some(
		(year) => year < selectedFinancialYear
	);
	if (!hasEarlier) return undefined;

	const financialYear = selectedFinancialYear - 1;
	const total = money(totalsByYear.get(financialYear) ?? 0);

	return {
		financialYear,
		label: financialYearLabel(financialYear),
		total,
		change: money(totalBilled - total),
		...(total > 0 ? { changeFraction: (totalBilled - total) / total } : {})
	};
}

type DatedInvoice = ReportInvoice & { financialYear: FinancialYear };

function monthlyTotals(
	financialYear: FinancialYear,
	invoices: DatedInvoice[]
): MonthTotal[] {
	const totals = new Array<number>(12).fill(0);

	for (const invoice of invoices) {
		const index = monthIndexInFinancialYear(invoice.date);
		totals[index] += invoice.content.total;
	}

	return financialYearMonths(financialYear).map((month, index) => ({
		label: month.label,
		total: money(totals[index] ?? 0)
	}));
}

function clientTotals(
	invoices: DatedInvoice[],
	totalBilled: number
): ClientTotal[] {
	const byClient = new Map<string, { clientName: string; total: number }>();

	for (const invoice of invoices) {
		const existing = byClient.get(invoice.clientId);
		byClient.set(invoice.clientId, {
			clientName: invoice.clientName,
			total: (existing?.total ?? 0) + invoice.content.total
		});
	}

	return [...byClient.entries()]
		.map(([clientId, { clientName, total }]) => ({
			clientId,
			clientName,
			total: money(total),
			share: shareOf(total, totalBilled)
		}))
		.sort((a, b) => b.total - a.total);
}

/**
 * Support delivery only. A Provider Travel labour cost line carries the same
 * Support Item code as the support it travels to, so grouping keys off the
 * line's `kind` first - grouping by code alone would inflate these rows and
 * understate the travel breakdown below.
 */
function supportItemTotals(
	invoices: DatedInvoice[],
	totalBilled: number
): SupportItemTotal[] {
	const byCode = new Map<
		string,
		{ description: string; describedAt: number; total: number }
	>();

	for (const invoice of invoices) {
		const invoicedAt = utcDate(invoice.date).getTime();

		for (const line of invoice.content.lines) {
			if (line.kind !== "SUPPORT") continue;

			const existing = byCode.get(line.supportItemCode);
			// The most recently invoiced description wins, so a renamed item reads
			// under the name it was last billed as.
			const describes = !existing || invoicedAt >= existing.describedAt;

			byCode.set(line.supportItemCode, {
				description: describes
					? line.description
					: (existing?.description ?? line.description),
				describedAt: describes ? invoicedAt : (existing?.describedAt ?? 0),
				total: (existing?.total ?? 0) + line.total
			});
		}
	}

	return [...byCode.entries()]
		.map(([supportItemCode, { description, total }]) => ({
			supportItemCode,
			description,
			total: money(total),
			share: shareOf(total, totalBilled)
		}))
		.sort((a, b) => b.total - a.total);
}

function travelTotals(invoices: DatedInvoice[], totalBilled: number) {
	const totals = new Map<TravelKind, number>();

	for (const invoice of invoices) {
		for (const line of invoice.content.lines) {
			if (line.kind === "SUPPORT") continue;
			totals.set(line.kind, (totals.get(line.kind) ?? 0) + line.total);
		}
	}

	const rows = TRAVEL_KINDS.map(({ kind, label }) => ({
		kind,
		label,
		total: money(totals.get(kind) ?? 0)
	}));
	const subtotal = money(rows.reduce((sum, row) => sum + row.total, 0));

	return { rows, subtotal, shareOfTotal: shareOf(subtotal, totalBilled) };
}
