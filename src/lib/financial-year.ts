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

/** 0 for July through 11 for June. */
export const monthIndexInFinancialYear = (date: Date | string): number =>
	(utcDate(date).getMonth() - FY_START_MONTH + 12) % 12;

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

/** The twelve month labels of a Financial Year, in order from July. */
export const financialYearMonthLabels = (
	financialYear: FinancialYear
): string[] =>
	Array.from({ length: 12 }, (_, index) => {
		const month = (FY_START_MONTH + index) % 12;
		const year = financialYear + (month < FY_START_MONTH ? 1 : 0);

		return `${MONTH_NAMES[month]} ${twoDigit(year)}`;
	});
