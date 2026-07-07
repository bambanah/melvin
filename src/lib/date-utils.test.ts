import {
	formatActivityDuration,
	formatDuration,
	getDuration
} from "@/lib/date-utils";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { expect, test } from "vitest";
dayjs.extend(utc);

const dateFromTime = (time: string) => dayjs.utc(`1970-01-01T${time}`).toDate();

test("Should get duration", () => {
	expect(getDuration(dateFromTime("12:00"), dateFromTime("13:00"))).toEqual(1);
	expect(getDuration(dateFromTime("12:00"), dateFromTime("13:01"))).toEqual(
		1.016_666_666_666_666_6
	);
	expect(getDuration(dateFromTime("10:00"), dateFromTime("18:05"))).toEqual(
		8.083_333_333_333_334
	);
	expect(getDuration(dateFromTime("09:00"), dateFromTime("09:14"))).toEqual(
		0.233_333_333_333_333_34
	);
	expect(getDuration(dateFromTime("09:30"), dateFromTime("15:10"))).toEqual(
		5.666_666_666_666_667
	);
	expect(getDuration(dateFromTime("09:00"), dateFromTime("11:30"))).toEqual(
		2.5
	);
});

test("Should return 0 for equal start and end times", () => {
	expect(getDuration(dateFromTime("09:00"), dateFromTime("09:00"))).toEqual(0);
});

test("Should throw when end time precedes start time", () => {
	// Regression: 23:00 -> 01:00 used to bill as 22h via Math.abs.
	expect(() =>
		getDuration(dateFromTime("23:00"), dateFromTime("01:00"))
	).toThrow(/precedes startTime/);
});

test("formatActivityDuration degrades gracefully on reversed times", () => {
	expect(
		formatActivityDuration(dateFromTime("12:00"), dateFromTime("13:30"))
	).toEqual("1 hour, 30 mins");

	expect(
		formatActivityDuration(dateFromTime("23:00"), dateFromTime("01:00"))
	).toEqual("invalid time");
});

test("Should get pretty duration", () => {
	expect(
		formatDuration(getDuration(dateFromTime("12:00"), dateFromTime("13:00")))
	).toEqual("1 hour");

	expect(
		formatDuration(getDuration(dateFromTime("12:00"), dateFromTime("13:01")))
	).toEqual("1 hour, 1 min");

	expect(
		formatDuration(getDuration(dateFromTime("13:00"), dateFromTime("15:00")))
	).toEqual("2 hours");

	expect(
		formatDuration(getDuration(dateFromTime("13:00"), dateFromTime("15:30")))
	).toEqual("2 hours, 30 mins");

	expect(
		formatDuration(getDuration(dateFromTime("01:20"), dateFromTime("15:00")))
	).toEqual("13 hours, 40 mins");

	expect(
		formatDuration(getDuration(dateFromTime("09:12"), dateFromTime("13:34")))
	).toEqual("4 hours, 22 mins");

	expect(
		formatDuration(getDuration(dateFromTime("09:00"), dateFromTime("09:14")))
	).toEqual("14 mins");
});
