// Wall-clock helpers for the Log's wire shapes: day keys ("yyyy-MM-dd") and
// times of day ("HH:mm"). Captures stamp the Provider's local wall clock -
// the time they tapped - which is exactly what WorkSession's UTC-anchored
// day/time columns store.
import { utcDate } from "@/lib/date-utils";
import { format } from "date-fns";

export const todayKey = () => format(new Date(), "yyyy-MM-dd");

export const nowHHmm = () => format(new Date(), "HH:mm");

/** ISO stamp of the current tap, carried as `updatedAt` for last-write-wins. */
export const nowStamp = () => new Date().toISOString();

/** Day key of a UTC-midnight date column value. */
export const dayKeyOf = (date: Date) => format(utcDate(date), "yyyy-MM-dd");

/** "HH:mm" of a time-of-day column value (a Date on the UTC epoch day). */
export const timeOf = (time: Date) => format(utcDate(time), "HH:mm");

export const hhmmToMinutes = (hhmm: string) => {
	const [hours, minutes] = hhmm.split(":").map(Number);
	return hours * 60 + minutes;
};

export const minutesBetween = (fromHHmm: string, toHHmm: string) =>
	hhmmToMinutes(toHHmm) - hhmmToMinutes(fromHHmm);

export const formatDayKey = (key: string, pattern = "EEEE d MMM") =>
	format(utcDate(key), pattern);

export const formatMinutes = (minutes: number) =>
	minutes >= 60
		? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
		: `${minutes}m`;
