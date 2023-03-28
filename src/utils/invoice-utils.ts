import InvoiceType from "types/invoice";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

import supportItems from "../../public/ndis-support-catalogue-22-23.json";

const getNumber = (invoiceNo: string): number | undefined => {
	const matches = invoiceNo.match(/\d+$/);

	return matches ? Number(matches[0]) : undefined;
};

export const getNextInvoiceNo = (
	previousInvoiceNumbers: string[],
	clientInvoicePrefix?: string | null
): string => {
	if (previousInvoiceNumbers.length === 0) return "";

	const latestInvoiceNo = getHighestInvoiceNo(previousInvoiceNumbers);

	const invoicePrefix =
		clientInvoicePrefix || latestInvoiceNo?.replace(/\d+$/, "") || "";

	const matches = latestInvoiceNo?.match(/\d+$/);
	const numberOfDigits = matches ? matches[0].length : 0;

	return `${invoicePrefix}${
		matches
			? (Number.parseInt(matches[0]) + 1)
					.toString()
					.padStart(numberOfDigits, "0")
			: 1
	}`;
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

export const getInvoiceFileName = (invoice: InvoiceType) => {
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

export const getNonLabourTravelCode = (supportItemCode: string) => {
	// Identical to regex in support-item-schema, except capturing the group number (third block)
	const groupNumberMatch = supportItemCode.match(
		/^\d{2}_(?:\d{3}|\d{9})_(\d{4})_\d_\d(?:_T)?$/
	)?.[1];
	const groupNumber = Number(groupNumberMatch);

	const supportItem = supportItems.find(
		(activity) =>
			activity.registrationGroupNumber === groupNumber &&
			activity.supportItemName === "Provider travel - non-labour costs"
	);

	return supportItem?.supportItemNumber;
};
