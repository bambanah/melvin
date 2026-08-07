import type {
	InvoiceVersionContent,
	InvoiceVersionLine
} from "@/schema/invoice-version-schema";
import { describe, expect, test } from "vitest";
import { buildBillingReport, type ReportInvoice } from "./billing-report";

/**
 * A frozen Invoice Version line. Fixed literals only - no value is derived
 * from the current time, so every figure below is stable across runs.
 */
const line = (
	overrides: Partial<InvoiceVersionLine> & { total: number }
): InvoiceVersionLine => ({
	kind: "SUPPORT",
	description: "Weekday support",
	supportItemCode: "01_011_0107_1_1",
	serviceDate: "2025-08-01T00:00:00.000Z",
	quantity: 1,
	unit: "HOUR",
	unitPrice: overrides.total,
	detailsText: "",
	...overrides
});

const content = (
	lines: InvoiceVersionLine[],
	options: { backfilled?: boolean } = {}
): InvoiceVersionContent => ({
	schemaVersion: 1,
	...(options.backfilled ? { backfilled: true } : {}),
	header: {
		invoiceNo: "INV-001",
		displayInvoiceNo: "INV-001",
		date: "2025-08-01T00:00:00.000Z",
		participantName: "Alice"
	},
	provider: {},
	lines,
	total: lines.reduce((sum, l) => sum + l.total, 0)
});

const invoice = (
	date: string,
	client: string,
	lines: InvoiceVersionLine[],
	options: { backfilled?: boolean } = {}
): ReportInvoice => ({
	date,
	clientId: client.toLowerCase(),
	clientName: client,
	content: content(lines, options)
});

/** A fixed "today" inside FY 25-26, so the in-progress year never drifts. */
const TODAY = new Date("2026-02-15T00:00:00.000Z");

const report = (invoices: ReportInvoice[], financialYear?: number) =>
	buildBillingReport(invoices, { today: TODAY, financialYear });

describe("Total Billed", () => {
	test("sums the frozen totals of the selected Financial Year's invoices", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [line({ total: 100 })]),
			invoice("2025-09-01", "Bob", [line({ total: 250.5 })]),
			invoice("2024-08-01", "Alice", [line({ total: 999 })])
		]);

		expect(result.selectedFinancialYear).toBe(2025);
		expect(result.totalBilled).toBe(350.5);
	});

	test("an invoice dated 30 June falls in the closing Financial Year", () => {
		const result = report(
			[invoice("2026-06-30", "Alice", [line({ total: 100 })])],
			2025
		);

		expect(result.totalBilled).toBe(100);
	});

	test("an invoice dated 1 July falls in the opening Financial Year", () => {
		const result = report(
			[invoice("2026-07-01", "Alice", [line({ total: 100 })])],
			2025
		);

		expect(result.totalBilled).toBe(0);
		expect(
			report([invoice("2026-07-01", "Alice", [line({ total: 100 })])], 2026)
				.totalBilled
		).toBe(100);
	});

	test("defaults to the Financial Year in progress", () => {
		const result = report([
			invoice("2023-08-01", "Alice", [line({ total: 100 })])
		]);

		expect(result.selectedFinancialYear).toBe(2025);
		expect(result.totalBilled).toBe(0);
	});
});

describe("Financial Year series", () => {
	test("offers only years with invoices, plus the year in progress", () => {
		const result = report([
			invoice("2023-08-01", "Alice", [line({ total: 100 })]),
			invoice("2025-08-01", "Alice", [line({ total: 300 })])
		]);

		expect(result.years).toEqual([
			{ financialYear: 2023, label: "FY 23-24", total: 100, partial: false },
			{ financialYear: 2025, label: "FY 25-26", total: 300, partial: true }
		]);
	});

	test("shows the year in progress even when it holds no invoices", () => {
		const result = report([
			invoice("2025-01-10", "Alice", [line({ total: 100 })])
		]);

		expect(result.years.map((year) => year.financialYear)).toEqual([
			2024, 2025
		]);
	});

	test("includes a selected year outside the invoiced range", () => {
		const result = report(
			[invoice("2025-08-01", "Alice", [line({ total: 100 })])],
			2027
		);

		expect(result.years.map((year) => year.financialYear)).toEqual([
			2025, 2027
		]);
	});

	test("a year that has not finished is never shown as a final total", () => {
		const result = report([
			invoice("2024-08-01", "Alice", [line({ total: 100 })]),
			invoice("2025-08-01", "Alice", [line({ total: 100 })]),
			invoice("2026-08-01", "Alice", [line({ total: 100 })])
		]);

		expect(
			result.years.map((year) => [year.financialYear, year.partial])
		).toEqual([
			[2024, false],
			[2025, true],
			[2026, true]
		]);
	});
});

describe("monthly trend", () => {
	test("has twelve buckets from July, keyed on invoice date", () => {
		const result = report([
			invoice("2025-07-05", "Alice", [line({ total: 100 })]),
			invoice("2025-07-20", "Alice", [line({ total: 50 })]),
			invoice("2026-06-01", "Bob", [line({ total: 25 })])
		]);

		expect(result.months).toHaveLength(12);
		expect(result.months[0]).toEqual({ label: "Jul 25", total: 150 });
		expect(result.months[11]).toEqual({ label: "Jun 26", total: 25 });
	});

	test("sums exactly to Total Billed", () => {
		const result = report([
			invoice("2025-07-05", "Alice", [line({ total: 100.33 })]),
			invoice("2025-12-20", "Bob", [line({ total: 50.11 })]),
			invoice("2026-03-01", "Bob", [line({ total: 25.05 })])
		]);

		const summed = result.months.reduce((sum, month) => sum + month.total, 0);

		expect(summed).toBe(result.totalBilled);
	});
});

describe("Support Item breakdown", () => {
	test("excludes Provider Travel labour costs billed under the same Support Item code", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [
				line({
					kind: "SUPPORT",
					supportItemCode: "01_011_0107_1_1",
					total: 100
				}),
				line({
					kind: "TRAVEL_TIME",
					supportItemCode: "01_011_0107_1_1",
					description: "Provider travel",
					total: 40
				})
			])
		]);

		expect(result.supportItems).toEqual([
			{
				supportItemCode: "01_011_0107_1_1",
				description: "Weekday support",
				total: 100,
				share: 100 / 140
			}
		]);
	});

	test("is labelled from the frozen line description", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [
				line({ description: "Retired item name", total: 100 })
			])
		]);

		expect(result.supportItems[0]?.description).toBe("Retired item name");
	});

	test("sorts descending by amount", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [
				line({ supportItemCode: "A", description: "A", total: 50 }),
				line({ supportItemCode: "B", description: "B", total: 150 })
			])
		]);

		expect(result.supportItems.map((row) => row.supportItemCode)).toEqual([
			"B",
			"A"
		]);
	});
});

describe("travel and transport breakdown", () => {
	test("itemises all four non-support kinds and subtotals them", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [
				line({ kind: "SUPPORT", total: 600 }),
				line({ kind: "TRAVEL_TIME", total: 100 }),
				line({ kind: "TRAVEL_KM", total: 50 }),
				line({ kind: "ABT", total: 30 }),
				line({ kind: "EXPENSE", total: 20 })
			])
		]);

		expect(result.travel.rows).toEqual([
			{
				kind: "TRAVEL_TIME",
				label: "Provider Travel labour costs",
				total: 100
			},
			{
				kind: "TRAVEL_KM",
				label: "Provider Travel non-labour costs",
				total: 50
			},
			{ kind: "ABT", label: "Activity Based Transport distance", total: 30 },
			{ kind: "EXPENSE", label: "Transport Expenses", total: 20 }
		]);
		expect(result.travel.subtotal).toBe(200);
	});

	test("shares against Total Billed", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [
				line({ kind: "SUPPORT", total: 800 }),
				line({ kind: "TRAVEL_TIME", total: 200 })
			])
		]);

		expect(result.travel.shareOfTotal).toBe(0.2);
	});
});

describe("Client breakdown", () => {
	test("sorts descending by amount with shares summing to the whole", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [line({ total: 100 })]),
			invoice("2025-09-01", "Bob", [line({ total: 300 })])
		]);

		expect(result.clients).toEqual([
			{ clientId: "bob", clientName: "Bob", total: 300, share: 0.75 },
			{ clientId: "alice", clientName: "Alice", total: 100, share: 0.25 }
		]);
		expect(result.clients.reduce((sum, row) => sum + row.share, 0)).toBe(1);
	});

	test("counts distinct Clients, not Invoices", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [line({ total: 100 })]),
			invoice("2025-09-01", "Alice", [line({ total: 100 })]),
			invoice("2025-10-01", "Bob", [line({ total: 100 })])
		]);

		expect(result.invoiceCount).toBe(3);
		expect(result.clientCount).toBe(2);
	});
});

describe("previous Financial Year comparison", () => {
	test("compares against the year before the selected one", () => {
		const result = report([
			invoice("2024-08-01", "Alice", [line({ total: 200 })]),
			invoice("2025-08-01", "Alice", [line({ total: 300 })])
		]);

		expect(result.previousYear).toEqual({
			financialYear: 2024,
			label: "FY 24-25",
			total: 200,
			change: 100,
			changeFraction: 0.5
		});
	});

	test("is absent when nothing was billed before the selected year", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [line({ total: 300 })])
		]);

		expect(result.previousYear).toBeUndefined();
	});

	test("omits the percentage when the previous year billed nothing", () => {
		const result = report(
			[
				invoice("2023-08-01", "Alice", [line({ total: 100 })]),
				invoice("2025-08-01", "Alice", [line({ total: 300 })])
			],
			2025
		);

		expect(result.previousYear).toEqual({
			financialYear: 2024,
			label: "FY 24-25",
			total: 0,
			change: 300
		});
	});
});

describe("backfilled versions", () => {
	test("counts only versions flagged backfilled in the selected year", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [line({ total: 100 })], {
				backfilled: true
			}),
			invoice("2025-09-01", "Alice", [line({ total: 100 })]),
			invoice("2024-09-01", "Alice", [line({ total: 100 })], {
				backfilled: true
			})
		]);

		expect(result.backfilledCount).toBe(1);
	});

	test("is zero when none are backfilled", () => {
		const result = report([
			invoice("2025-08-01", "Alice", [line({ total: 100 })])
		]);

		expect(result.backfilledCount).toBe(0);
	});
});

describe("empty input", () => {
	test("yields a zero state rather than throwing", () => {
		const result = report([]);

		expect(result.totalBilled).toBe(0);
		expect(result.invoiceCount).toBe(0);
		expect(result.clientCount).toBe(0);
		expect(result.clients).toEqual([]);
		expect(result.supportItems).toEqual([]);
		expect(result.months).toHaveLength(12);
		expect(result.travel.subtotal).toBe(0);
		expect(result.travel.shareOfTotal).toBe(0);
		expect(result.previousYear).toBeUndefined();
		expect(result.years).toEqual([
			{ financialYear: 2025, label: "FY 25-26", total: 0, partial: true }
		]);
	});
});
