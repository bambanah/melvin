import { validateTimeRange } from "@/components/forms/time-range-input";
import { expect, test } from "vitest";

test("a start-before-end range is valid", () => {
	expect(
		validateTimeRange({ startTime: "09:30", endTime: "13:50" })
	).toBeNull();
});

test("an end before the start is rejected", () => {
	expect(validateTimeRange({ startTime: "13:50", endTime: "09:30" })).toBe(
		"End time must be after start time"
	);
});

test("equal start and end times are rejected", () => {
	expect(validateTimeRange({ startTime: "09:30", endTime: "09:30" })).toBe(
		"End time must be after start time"
	);
});

test("undefined value is required", () => {
	expect(validateTimeRange(undefined)).toBe("Time range is required");
});

test("a missing start time is required", () => {
	expect(validateTimeRange({ startTime: "", endTime: "13:50" })).toBe(
		"Time range is required"
	);
});

test("a missing end time is required", () => {
	expect(validateTimeRange({ startTime: "09:30", endTime: "" })).toBe(
		"Time range is required"
	);
});

test("out-of-range hours are rejected", () => {
	expect(validateTimeRange({ startTime: "09:30", endTime: "25:00" })).toBe(
		"Invalid time"
	);
});

test("out-of-range minutes are rejected", () => {
	expect(validateTimeRange({ startTime: "09:60", endTime: "13:50" })).toBe(
		"Invalid time"
	);
});

test("a non-numeric time is rejected", () => {
	expect(validateTimeRange({ startTime: "09:30", endTime: "abc" })).toBe(
		"Invalid time"
	);
});
