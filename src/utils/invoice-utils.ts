import { InvoiceByIdOutput } from "@server/api/routers/invoice-router";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const getNumber = (invoiceNo: string): number | undefined => {
	const matches = invoiceNo.match(/\d+$/);

	return matches ? Number(matches[0]) : undefined;
};

export const getNextInvoiceNo = (
	previousInvoiceNumbers: string[],
	clientInvoicePrefix?: string | null
) => {
	if (previousInvoiceNumbers.length === 0)
		return {
			nextInvoiceNo: clientInvoicePrefix ? `${clientInvoicePrefix}1` : "",
			latestInvoiceNo: "",
		};

	const latestInvoiceNo = getHighestInvoiceNo(previousInvoiceNumbers);

	const invoicePrefix =
		clientInvoicePrefix || latestInvoiceNo?.replace(/\d+$/, "") || "";

	const matches = latestInvoiceNo?.match(/\d+$/);
	const numberOfDigits = matches ? matches[0].length : 0;

	const nextInvoiceNo = `${invoicePrefix}${
		matches
			? (Number.parseInt(matches[0]) + 1)
					.toString()
					.padStart(numberOfDigits, "0")
			: 1
	}`;

	return { nextInvoiceNo, latestInvoiceNo };
};

export const getHighestInvoiceNo = (
	invoiceNumbers: string[]
): string | undefined => {
	if (invoiceNumbers.length === 0) {
		return undefined;
	}

	// eslint-disable-next-line unicorn/no-array-reduce
	const highest = invoiceNumbers.reduce((previous, current) => {
		if (getNumber(current) === null) return previous;

		return (getNumber(previous) || 0) > (getNumber(current) || 0)
			? previous
			: current;
	});

	return getNumber(highest) ? highest : undefined;
};

export const getInvoiceFileName = (invoice: InvoiceByIdOutput) => {
	let earliestDate = invoice.activities[0].date;
	let latestDate = invoice.activities[0].date;
	for (const { date } of invoice.activities) {
		if (dayjs(date).isBefore(dayjs(earliestDate))) earliestDate = date;
		if (dayjs(date).isAfter(dayjs(latestDate))) latestDate = date;
	}

	const dateRangeFormatted = dayjs(earliestDate).isSame(latestDate)
		? dayjs(earliestDate).format("DD-MM")
		: `(${dayjs(earliestDate).format("DD-MM")})-(${dayjs(latestDate).format(
				"DD-MM"
		  )})`;

	const fileName = `${invoice.invoiceNo}_${dateRangeFormatted}-${dayjs(
		invoice.date
	).format("YYYY")}.pdf`;

	return fileName;
};
