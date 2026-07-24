import { billableTravelDuration, defaultTravelDuration } from "@/lib/log-utils";
import { expect, test } from "vitest";

test("Default travel duration is the gap between sessions when under the cap", () => {
	expect(defaultTravelDuration(20)).toBe(20);
});

test("Default travel duration is clamped to the 30-minute cap", () => {
	expect(defaultTravelDuration(45)).toBe(30);
});

test("A zero gap defaults to zero billable travel time", () => {
	expect(defaultTravelDuration(0)).toBe(0);
});

test("An entered duration within the gap and cap bills as entered", () => {
	expect(billableTravelDuration(15, 20)).toEqual({
		duration: 15,
		exceedsGap: false
	});
});

test("No entered duration falls back to the gap-clamped default", () => {
	expect(billableTravelDuration(null, 45)).toEqual({
		duration: 30,
		exceedsGap: false
	});
});

test("An entered duration over the gap warns but bills only the gap", () => {
	expect(billableTravelDuration(25, 10)).toEqual({
		duration: 10,
		exceedsGap: true
	});
});

test("An entered duration over the 30-minute cap bills the cap", () => {
	expect(billableTravelDuration(40, 60)).toEqual({
		duration: 30,
		exceedsGap: false
	});
});

test("A zero gap bills zero even when a duration was entered", () => {
	expect(billableTravelDuration(10, 0)).toEqual({
		duration: 0,
		exceedsGap: true
	});
});
