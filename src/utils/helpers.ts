import { FormValues } from "@components/invoices/invoice-form";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { InvoiceByIdOutput } from "@server/routers/invoice-router";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { FormikErrors, FormikTouched, getIn } from "formik";
import InvoiceType from "types/invoice";
import supportItems from "../../public/ndis-support-catalogue-22-23.json";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export const getDuration = (startTime: Date, endTime: Date): number => {
	const startDate = dayjs(startTime);
	const endDate = dayjs(endTime);

	const diffInMinutes = Math.abs(startDate.diff(endDate, "minutes"));
	const diffInHours = diffInMinutes / 60;

	return diffInHours;
};

export const getPrettyDuration = (duration: number) => {
	const hourItem = dayjs()
		.set("hours", duration)
		.set("minutes", round((duration % 1) * 60, 0));

	let durationString = "";

	const hours = hourItem.get("hours");
	const minutes = hourItem.get("minutes");
	if (hours > 0) durationString += `${hours} hour${hours === 1 ? "" : "s"}`;

	if (minutes > 0)
		durationString = `${
			durationString.length > 0 ? `${durationString}, ` : ""
		}${minutes} min${minutes === 1 ? "" : "s"}`;

	return durationString;
};

const getNumber = (invoiceNo: string): number | undefined => {
	const matches = invoiceNo.match(/\d+$/);

	return matches ? Number(matches[0]) : undefined;
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

export const getRate = (activity: {
	date: Date;
	startTime: Date;
	endTime: Date;
	supportItem: {
		weekdayCode: string;
		weekdayRate: Prisma.Decimal | string;
		weeknightCode?: string | null;
		weeknightRate?: Prisma.Decimal | null;
		saturdayCode?: string | null;
		saturdayRate?: Prisma.Decimal | null;
		sundayCode?: string | null;
		sundayRate?: Prisma.Decimal | null;
	};
}): [code: string, rate: number] => {
	let rate = new Prisma.Decimal(0);
	let itemCode = "";

	if (
		dayjs.utc(activity.date).day() === 6 &&
		activity.supportItem.saturdayRate &&
		activity.supportItem.saturdayCode?.length
	) {
		// Saturday
		rate =
			typeof activity.supportItem.saturdayRate === "string"
				? new Prisma.Decimal(activity.supportItem.saturdayRate)
				: activity.supportItem.saturdayRate;
		itemCode = activity.supportItem.saturdayCode;
	} else if (
		dayjs.utc(activity.date).day() === 0 &&
		activity.supportItem.sundayRate &&
		activity.supportItem.sundayRate &&
		activity.supportItem.sundayCode?.length
	) {
		// Sunday
		rate =
			typeof activity.supportItem.sundayRate === "string"
				? new Prisma.Decimal(activity.supportItem.sundayRate)
				: activity.supportItem.sundayRate;
		itemCode = activity.supportItem.sundayCode;
	} else if (
		activity.endTime &&
		activity.supportItem.weeknightCode?.length &&
		activity.supportItem.weeknightRate &&
		dayjs.utc(activity.endTime).isAfter(dayjs.utc("1970-01-01T19:59"))
	) {
		// Day is a weekday and it's after 8pm
		rate =
			typeof activity.supportItem.weeknightRate === "string"
				? new Prisma.Decimal(activity.supportItem.weeknightRate)
				: activity.supportItem.weeknightRate;
		itemCode = activity.supportItem.weeknightCode;
	} else {
		// Weekday before 8pm
		rate =
			typeof activity.supportItem.weekdayRate === "string"
				? new Prisma.Decimal(activity.supportItem.weekdayRate)
				: activity.supportItem.weekdayRate;
		itemCode = activity.supportItem.weekdayCode;
	}

	return [itemCode, Number(rate)];
};

export const fetcher = (url: string) =>
	fetch(url).then((response) => response.json());

export const invoiceToValues = (invoice: InvoiceByIdOutput): FormValues => ({
	id: invoice.id,
	invoiceNo: invoice.invoiceNo,
	clientId: invoice.clientId,
	billTo: invoice.billTo,
	date: dayjs.utc(invoice.date).format("DD/MM/YYYY"),
	activities: invoice.activities.map((activity) => ({
		id: activity.id,
		supportItemId: activity.supportItemId ?? "",
		date: dayjs.utc(activity.date).format("YYYY-MM-DD"),
		itemDistance: activity.itemDistance?.toString() ?? "",
		transitDistance: activity.transitDistance?.toString() ?? "",
		transitDuration: activity.transitDuration?.toString() ?? "",
		startTime: dayjs.utc(activity.startTime).format("HH:mm"),
		endTime: dayjs.utc(activity.endTime).format("HH:mm"),
	})),
});

export const valuesToInvoice = (values: FormValues) => ({
	invoice: {
		id: values.id ?? undefined,
		invoiceNo: values.invoiceNo,
		clientId: values.clientId,
		billTo: values.billTo,
		date: values.date
			? dayjs.utc(values.date, "DD/MM/YYYY").toDate()
			: new Date(),
		status: InvoiceStatus.CREATED,
	},
	activities: values.activities.map((activity) => ({
		id: activity.id,
		date: dayjs.utc(activity.date, "YYYY-MM-DD").toDate(),
		itemDistance: Number(activity.itemDistance) || undefined,
		transitDistance: Number(activity.transitDistance) || undefined,
		transitDuration: Number(activity.transitDuration) || undefined,
		startTime: dayjs.utc(`1970-01-01T${activity.startTime}`).toDate(),
		endTime: dayjs.utc(`1970-01-01T${activity.endTime}`).toDate(),
		supportItemId: activity.supportItemId,
	})),
});

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

export function round(value: number, exp: number) {
	if (exp === undefined || +exp === 0) return Math.round(value);

	if (Number.isNaN(value) || !(typeof exp === "number" && exp % 1 === 0))
		return Number.NaN;

	// Shift
	let valueArray = value.toString().split("e");
	value = Math.round(
		+`${valueArray[0]}e${valueArray[1] ? +valueArray[1] + exp : exp}`
	);

	// Shift back
	valueArray = value.toString().split("e");
	return +`${valueArray[0]}e${valueArray[1] ? +valueArray[1] - exp : -exp}`;
}

export const getTotalCost = (
	activities: {
		date: Date;
		startTime: Date;
		endTime: Date;
		transitDuration: number | null;
		transitDistance: number | null;
		supportItem: {
			description: string;
			weekdayCode: string;
			weekdayRate: Prisma.Decimal | string;
			weeknightCode?: string | null;
			weeknightRate: Prisma.Decimal | null;
			saturdayCode?: string | null;
			saturdayRate: Prisma.Decimal | null;
			sundayCode?: string | null;
			sundayRate: Prisma.Decimal | null;
		};
	}[]
) => {
	const grandTotal = activities
		.map((activity) => {
			const [, rate] = getRate(activity);

			let subTotal = 0;
			const duration = getDuration(activity.startTime, activity.endTime);

			subTotal += round(duration * Number(rate), 2);

			if (activity.transitDistance) {
				const isGroup =
					activity.supportItem.description.includes("Group Activities");
				const ratePerKm = isGroup ? 0.43 : 0.85;
				subTotal += round(activity.transitDistance * ratePerKm, 2);
			}

			if (activity.transitDuration) {
				subTotal += round(activity.transitDuration * (Number(rate) / 60), 2);
			}

			return subTotal;
		})
		.reduce((previous, current) => previous + current, 0);

	return round(grandTotal, 2);
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

export const errorIn = (
	errors: FormikErrors<unknown>,
	touched: FormikTouched<unknown>,
	value: string
): boolean => getIn(errors, value) !== undefined && getIn(touched, value);
