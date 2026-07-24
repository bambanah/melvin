import {
	formatActivityDuration,
	formatDuration,
	getDuration,
	stripTimezone
} from "@/lib/date-utils";

import { TZDate } from "@date-fns/tz";
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

// stripTimezone reads a Date's *local* calendar components and re-anchors them
// at 00:00:00 UTC. Building inputs as `TZDate` instances in an explicit zone
// (via @date-fns/tz) makes each assertion deterministic on any runner without
// mutating global TZ state. `reinterpret` re-reads an instant in a given zone,
// which is how a second stripTimezone pass sees its own (UTC-midnight) output.
const reinterpret = (date: Date, tz: string) => new TZDate(date.getTime(), tz);

test("stripTimezone maps a local date's calendar day to UTC midnight", () => {
	// 23:30 on the 15th in UTC+10 -> the 15th at 00:00 UTC (time-of-day discarded).
	const local = new TZDate(2024, 0, 15, 23, 30, "Australia/Brisbane");
	expect(stripTimezone(local).toISOString()).toBe("2024-01-15T00:00:00.000Z");
});

test("stripTimezone always resets the time-of-day to UTC midnight", () => {
	const result = stripTimezone(
		new TZDate(2024, 5, 30, 17, 45, 12, 500, "Australia/Brisbane")
	);
	expect(result.getUTCHours()).toBe(0);
	expect(result.getUTCMinutes()).toBe(0);
	expect(result.getUTCSeconds()).toBe(0);
	expect(result.getUTCMilliseconds()).toBe(0);
});

test("stripTimezone is idempotent in a non-negative UTC offset", () => {
	// UTC+10: the first result (UTC midnight) reads back as the same local day,
	// so a second application is a fixed point.
	const once = stripTimezone(
		new TZDate(2024, 0, 15, 23, 30, "Australia/Brisbane")
	);
	const twice = stripTimezone(reinterpret(once, "Australia/Brisbane"));
	expect(twice.toISOString()).toBe(once.toISOString());
});

test("stripTimezone anchors on the local calendar day of a UTC-negative zone", () => {
	// stripTimezone is defined by the *local* calendar day: a fresh picker date
	// converts correctly in any zone (first assertion). It is only non-idempotent
	// in UTC-negative zones because its own output (UTC midnight) reads back as
	// the previous local day there. Melvin runs in UTC+10, so this never bites in
	// practice; the test documents the semantics rather than a defect.
	const once = stripTimezone(
		new TZDate(2024, 0, 15, 23, 30, "America/New_York")
	);
	const twice = stripTimezone(reinterpret(once, "America/New_York"));
	expect(once.toISOString()).toBe("2024-01-15T00:00:00.000Z");
	expect(twice.toISOString()).toBe("2024-01-14T00:00:00.000Z");
});
