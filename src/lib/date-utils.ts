import { round } from "./generic-utils";

import { TZDate, tz } from "@date-fns/tz";
import {
	differenceInMinutes,
	format,
	getHours,
	getMinutes,
	parse,
	setDate,
	setHours,
	setMinutes,
	setMonth
} from "date-fns";

/**
 * A UTC-anchored view of an instant - the single place the `"UTC"` timezone
 * lives. Use it to read wall-clock fields (`getHours`, `getDay`, ...) or to
 * `format`/`toISOString` an instant as UTC, regardless of the viewer's zone.
 */
export const utcDate = (value: Date | string | number): TZDate =>
	new TZDate(new Date(value), "UTC");

/**
 * Parses an `HH:mm` wall-clock string into a UTC-anchored Date on the epoch
 * day (1970-01-01). The date portion is irrelevant to callers - only the
 * time-of-day is ever read back - so the epoch reference keeps it deterministic.
 * A missing time yields an Invalid Date, matching the prior dayjs behaviour.
 */
export const parseUtcTime = (time: string | undefined): Date =>
	time === undefined
		? new Date(NaN)
		: parse(time, "HH:mm", new TZDate(0, "UTC"), { in: tz("UTC") });

export function getDuration(startTime: Date, endTime: Date): number {
	const diffInMinutes = differenceInMinutes(endTime, startTime);

	if (diffInMinutes < 0) {
		throw new Error(
			`getDuration: endTime ${endTime.toISOString()} precedes startTime ${startTime.toISOString()}`
		);
	}

	const diffInHours = diffInMinutes / 60;

	return diffInHours;
}

export function formatActivityDuration(startTime: Date, endTime: Date): string {
	try {
		return formatDuration(getDuration(startTime, endTime));
	} catch {
		return "invalid time";
	}
}

export const formatDuration = (duration: number) => {
	const hourItem = setMinutes(
		setHours(new Date(), duration),
		round((duration % 1) * 60, 0)
	);

	let durationString = "";

	const hours = getHours(hourItem);
	const minutes = getMinutes(hourItem);
	if (hours > 0) durationString += `${hours} hour${hours === 1 ? "" : "s"}`;

	if (minutes > 0)
		durationString = `${
			durationString.length > 0 ? `${durationString}, ` : ""
		}${minutes} min${minutes === 1 ? "" : "s"}`;

	return durationString;
};

// TODO: Implement dynamic holidays
// (e.g. Easter occurs on the Sunday after the first full moon following the vernal equinox)
const holiday = (day: number, month: number) =>
	format(setMonth(setDate(new Date(), day), month), "dd/MM/yyyy");

const HOLIDAYS = new Set([
	holiday(1, 0),
	holiday(26, 0),
	holiday(25, 3),
	holiday(24, 11),
	holiday(25, 11),
	holiday(26, 11)
]);

export function isHoliday(date: Date | string) {
	return HOLIDAYS.has(format(new Date(date), "dd/MM/yyyy"));
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
