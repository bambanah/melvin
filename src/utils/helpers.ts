import { FormikErrors, FormikTouched, getIn } from "formik";
import dayjs from "dayjs";

export const formatDate = (date: Date) => {
	const YYYY = date.getFullYear();
	const MM = `0${date.getMonth() + 1}`.slice(-2);
	const DD = `0${date.getDate()}`.slice(-2);

	return `${DD}/${MM}/${YYYY}`;
};

export const getDuration = (startTime: string, endTime: string): number => {
	const startDate = dayjs("1970-01-01T" + startTime, "YYYY-MM-DDTHH:mm");
	const endDate = dayjs("1970-01-01T" + endTime, "YYYY-MM-DDTHH:mm");

	const diffInMinutes = Math.abs(startDate.diff(endDate, "minutes"));
	const diffInHours = diffInMinutes / 60;

	return Math.round(diffInHours * 1000) / 1000;
};

export const getPrettyDuration = (duration: number) => {
	const hourItem = dayjs()
		.set("hours", duration)
		.set("minutes", (duration % 1) * 60);

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

export const getHighestInvoiceNo = (
	invoiceNumbers: string[]
): string | null => {
	if (!invoiceNumbers.length) {
		return null;
	}

	const getNumber = (invoiceNo: string): number | null => {
		const matches = invoiceNo.match(/\d+$/);

		return matches ? Number(matches[0]) : null;
	};

	const highest = invoiceNumbers.reduce((prev, current) => {
		if (getNumber(current) === null) return prev;

		return (getNumber(prev) || 0) > (getNumber(current) || 0) ? prev : current;
	});

	return getNumber(highest) ? highest : null;
};

export const getNextInvoiceNo = (
	previousInvoiceNumbers?: string[],
	clientInvoicePrefix?: string | null
): string => {
	if (!previousInvoiceNumbers?.length && !clientInvoicePrefix) return "";

	const latestInvoiceNo = previousInvoiceNumbers?.length
		? getHighestInvoiceNo(previousInvoiceNumbers)
		: null;

	const invoicePrefix =
		clientInvoicePrefix ?? latestInvoiceNo?.replace(/\d+$/, "") ?? "";

	const matches = latestInvoiceNo?.match(/\d+$/);

	return `${invoicePrefix.replace(/-+$/, "")}-${
		matches ? parseInt(matches[0]) + 1 : 1
	}`;
};

export const getRate = async (
	activityId: string
): Promise<[code: string, rate: number]> => {
	return [activityId, 1];
};

export const getTotalCost = async (invoiceId: string) => {
	const totalCost = invoiceId.length;

	return totalCost;
};

export const getTotalString = (invoiceId: string) =>
	getTotalCost(invoiceId).then((cost) => `$${cost.toFixed(2)}`);

export const errorIn = (
	errors: FormikErrors<unknown>,
	touched: FormikTouched<unknown>,
	value: string
): boolean => getIn(errors, value) !== undefined && getIn(touched, value);
