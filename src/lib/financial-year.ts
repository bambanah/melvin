import { utcDate } from "./date-utils";

/**
 * The Australian Financial Year, identified by the calendar year it opens in:
 * 2025 is 1 July 2025 to 30 June 2026, labelled "FY 25-26".
 */
export type FinancialYear = number;

/** July, zero-indexed - the month a Financial Year opens on. */
const FY_START_MONTH = 6;

export const financialYearOf = (date: Date | string): FinancialYear => {
	const instant = utcDate(date);

	return instant.getMonth() >= FY_START_MONTH
		? instant.getFullYear()
		: instant.getFullYear() - 1;
};

const twoDigit = (year: number) => String(year % 100).padStart(2, "0");

export const financialYearLabel = (financialYear: FinancialYear): string =>
	`FY ${twoDigit(financialYear)}-${twoDigit(financialYear + 1)}`;

export const financialYearRange = (financialYear: FinancialYear) => ({
	start: new Date(Date.UTC(financialYear, FY_START_MONTH, 1)),
	endExclusive: new Date(Date.UTC(financialYear + 1, FY_START_MONTH, 1))
});

/** 0 for July through 11 for June. */
export const monthIndexInFinancialYear = (date: Date | string): number =>
	(utcDate(date).getMonth() - FY_START_MONTH + 12) % 12;

export interface FinancialYearMonth {
	/** e.g. "Jul 25" */
	label: string;
	year: number;
	/** Zero-indexed calendar month. */
	month: number;
}

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];

/** The twelve months of a Financial Year, in order from July. */
export const financialYearMonths = (
	financialYear: FinancialYear
): FinancialYearMonth[] =>
	Array.from({ length: 12 }, (_, index) => {
		const month = (FY_START_MONTH + index) % 12;
		const year = financialYear + (month < FY_START_MONTH ? 1 : 0);

		return { label: `${MONTH_NAMES[month]} ${twoDigit(year)}`, year, month };
	});

/**
 * Every Financial Year from the earliest to the latest given, gaps included -
 * a year with no Invoices still belongs on an axis that spans it.
 */
export const financialYearsSpanning = (
	financialYears: FinancialYear[]
): FinancialYear[] => {
	if (financialYears.length === 0) return [];

	const first = Math.min(...financialYears);
	const last = Math.max(...financialYears);

	return Array.from({ length: last - first + 1 }, (_, index) => first + index);
};
