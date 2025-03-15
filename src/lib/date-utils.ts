import { round } from "./generic-utils";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export function getDuration(startTime: Date, endTime: Date): number {
	const startDate = dayjs(startTime);
	const endDate = dayjs(endTime);

	const diffInMinutes = Math.abs(startDate.diff(endDate, "minutes"));
	const diffInHours = diffInMinutes / 60;

	return diffInHours;
}

export const formatDuration = (duration: number) => {
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

export const getTotalInvoiceHours = () => {
	return 69;
};

// TODO: Implement dynamic holidays
// (e.g. Easter occurs on the Sunday after the first full moon following the vernal equinox)
const HOLIDAYS = new Set([
	dayjs().date(1).month(0).format("DD/MM/YYYY"),
	dayjs().date(26).month(0).format("DD/MM/YYYY"),
	dayjs().date(25).month(3).format("DD/MM/YYYY"),
	dayjs().date(24).month(11).format("DD/MM/YYYY"),
	dayjs().date(25).month(11).format("DD/MM/YYYY"),
	dayjs().date(26).month(11).format("DD/MM/YYYY")
]);

export function isHoliday(date: Date | string) {
	return HOLIDAYS.has(dayjs(date).format("DD/MM/YYYY"));
}

/**
 * Strips the timezone from a locally instantiated Date object.
 * @param date A Date object with timezone offset
 * @returns Date object reset to UTC without changing the time
 */
export const stripTimezone = (date: Date) => {
	return new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
	);
};
