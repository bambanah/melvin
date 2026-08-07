import { describe, expect, test } from "vitest";
import {
	financialYearLabel,
	financialYearMonths,
	financialYearOf,
	financialYearRange,
	financialYearsSpanning,
	monthIndexInFinancialYear
} from "./financial-year";

describe("financialYearOf", () => {
	test("1 July opens a new financial year", () => {
		expect(financialYearOf("2025-07-01T00:00:00.000Z")).toBe(2025);
	});

	test("30 June closes the year that opened the previous July", () => {
		expect(financialYearOf("2026-06-30T00:00:00.000Z")).toBe(2025);
	});

	test("reads the date as UTC regardless of the viewer's zone", () => {
		expect(financialYearOf(new Date("2025-06-30T23:59:59.000Z"))).toBe(2024);
	});
});

describe("financialYearLabel", () => {
	test("labels the year by the two calendar years it spans", () => {
		expect(financialYearLabel(2025)).toBe("FY 25-26");
	});

	test("pads a single-digit year", () => {
		expect(financialYearLabel(2008)).toBe("FY 08-09");
	});

	test("carries across a century boundary", () => {
		expect(financialYearLabel(2099)).toBe("FY 99-00");
	});
});

describe("financialYearRange", () => {
	test("runs from 1 July to the following 1 July, exclusive", () => {
		expect(financialYearRange(2025)).toEqual({
			start: new Date("2025-07-01T00:00:00.000Z"),
			endExclusive: new Date("2026-07-01T00:00:00.000Z")
		});
	});
});

describe("monthIndexInFinancialYear", () => {
	test("July is the first month and June the last", () => {
		expect(monthIndexInFinancialYear("2025-07-15T00:00:00.000Z")).toBe(0);
		expect(monthIndexInFinancialYear("2026-06-15T00:00:00.000Z")).toBe(11);
	});

	test("January sits in the second half of the year", () => {
		expect(monthIndexInFinancialYear("2026-01-15T00:00:00.000Z")).toBe(6);
	});
});

describe("financialYearMonths", () => {
	test("lists twelve months from July to June", () => {
		const months = financialYearMonths(2025);

		expect(months).toHaveLength(12);
		expect(months[0]).toEqual({ label: "Jul 25", year: 2025, month: 6 });
		expect(months[11]).toEqual({ label: "Jun 26", year: 2026, month: 5 });
	});
});

describe("financialYearsSpanning", () => {
	test("fills the gaps between the earliest and latest year", () => {
		expect(financialYearsSpanning([2023, 2026, 2023])).toEqual([
			2023, 2024, 2025, 2026
		]);
	});

	test("is empty for no years at all", () => {
		expect(financialYearsSpanning([])).toEqual([]);
	});
});
