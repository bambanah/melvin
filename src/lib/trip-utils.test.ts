import {
	calculateTripTransit,
	getEffectiveTransitRate,
	sortActivitiesByTime,
	type InterClientLeg,
	type TripActivity
} from "@/lib/trip-utils";
import { Prisma } from "@/generated/client";
import { expect, test } from "vitest";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const getTripActivity = (
	id: string,
	startTime: string | null,
	{
		distanceToClient = 5,
		travelTimeToClient = 15
	}: { distanceToClient?: number; travelTimeToClient?: number } = {}
): TripActivity => ({
	id,
	startTime: startTime ? dayjs.utc(`1970-01-01T${startTime}`).toDate() : null,
	endTime: null,
	transitDistance: null,
	transitDuration: null,
	client: {
		distanceToClient: new Prisma.Decimal(distanceToClient),
		travelTimeToClient: new Prisma.Decimal(travelTimeToClient),
		transitRatePerKm: null
	}
});

const getLeg = (
	fromActivityId: string,
	toActivityId: string,
	distance: number,
	duration: number
): InterClientLeg => ({ fromActivityId, toActivityId, distance, duration });

test("Empty input returns an empty Map", () => {
	expect(calculateTripTransit([], [])).toEqual(new Map());
});

test("Single activity gets first-leg values only, no return leg", () => {
	const activity = getTripActivity("a1", "09:00", {
		distanceToClient: 10,
		travelTimeToClient: 12
	});

	const result = calculateTripTransit([activity], []);

	expect(result.get("a1")).toEqual({
		transitDistance: 10,
		transitDuration: 12,
		durationCapped: false
	});
});

test("Two activities: first gets home leg, second gets the inter-client leg plus the return leg", () => {
	const first = getTripActivity("a1", "09:00", {
		distanceToClient: 10,
		travelTimeToClient: 12
	});
	const second = getTripActivity("a2", "10:00", {
		distanceToClient: 7,
		travelTimeToClient: 9
	});
	const legs = [getLeg("a1", "a2", 3, 8)];

	const result = calculateTripTransit([first, second], legs);

	expect(result.get("a1")).toEqual({
		transitDistance: 10,
		transitDuration: 12,
		durationCapped: false
	});
	// Leg values (3, 8) plus the return leg (distanceToClient 7, travelTimeToClient 9)
	expect(result.get("a2")).toEqual({
		transitDistance: 10,
		transitDuration: 17,
		durationCapped: false
	});
});

test("Middle activity of three gets exactly its incoming leg, no return component", () => {
	const first = getTripActivity("a1", "09:00");
	const middle = getTripActivity("a2", "10:00");
	const last = getTripActivity("a3", "11:00");
	const legs = [getLeg("a1", "a2", 3, 8), getLeg("a2", "a3", 4, 6)];

	const result = calculateTripTransit([first, middle, last], legs);

	expect(result.get("a2")).toEqual({
		transitDistance: 3,
		transitDuration: 8,
		durationCapped: false
	});
});

// NOTE: characterizes current behavior — see docs/plans/README.md
test("A missing inter-client leg silently yields zero transit for that activity", () => {
	const first = getTripActivity("a1", "09:00");
	const middle = getTripActivity("a2", "10:00");
	const last = getTripActivity("a3", "11:00");
	// No leg registered from a1 -> a2
	const legs = [getLeg("a2", "a3", 4, 6)];

	const result = calculateTripTransit([first, middle, last], legs);

	expect(result.get("a2")).toEqual({
		transitDistance: 0,
		transitDuration: 0,
		durationCapped: false
	});
});

test("Travel Time Cap: first activity duration is capped at 30 minutes", () => {
	const activity = getTripActivity("a1", "09:00", { travelTimeToClient: 45 });

	const result = calculateTripTransit([activity], []);

	expect(result.get("a1")).toEqual({
		transitDistance: 5,
		transitDuration: 30,
		durationCapped: true
	});
});

// NOTE: characterizes current behavior — see docs/plans/README.md
test("Cap stacking: the last activity's incoming leg and return leg are each capped independently", () => {
	const first = getTripActivity("a1", "09:00");
	const last = getTripActivity("a2", "10:00", { travelTimeToClient: 45 });
	const legs = [getLeg("a1", "a2", 3, 45)];

	const result = calculateTripTransit([first, last], legs);

	expect(result.get("a2")).toEqual({
		transitDistance: 3 + 5,
		transitDuration: 30 + 30,
		durationCapped: true
	});
});

test("Activities out of startTime order are allocated as if sorted; null startTime sorts last", () => {
	const early = getTripActivity("a1", "09:00", {
		distanceToClient: 10,
		travelTimeToClient: 12
	});
	const late = getTripActivity("a2", "11:00", {
		distanceToClient: 7,
		travelTimeToClient: 9
	});
	const noStartTime = getTripActivity("a3", null, {
		distanceToClient: 4,
		travelTimeToClient: 6
	});
	const legs = [getLeg("a1", "a2", 3, 8)];

	// Passed out of order: late, early, noStartTime
	const result = calculateTripTransit([late, early, noStartTime], legs);

	expect(result.get("a1")).toEqual({
		transitDistance: 10,
		transitDuration: 12,
		durationCapped: false
	});
	// Sorted order is a1, a2, a3 (null sorts last) - a2 is now the middle activity
	expect(result.get("a2")).toEqual({
		transitDistance: 3,
		transitDuration: 8,
		durationCapped: false
	});
	// a3 (null startTime) is last: no incoming leg, plus its own return leg
	expect(result.get("a3")).toEqual({
		transitDistance: 4,
		transitDuration: 6,
		durationCapped: false
	});
});

test("getEffectiveTransitRate: client override wins over the user rate", () => {
	const client = { transitRatePerKm: new Prisma.Decimal(0.75) };
	const user = { transitRatePerKm: new Prisma.Decimal(0.99) };

	expect(getEffectiveTransitRate(client, user)).toEqual(0.75);
});

test("getEffectiveTransitRate: falls back to the user rate when client has none", () => {
	const user = { transitRatePerKm: new Prisma.Decimal(0.99) };

	expect(getEffectiveTransitRate(null, user)).toEqual(0.99);
	expect(getEffectiveTransitRate({ transitRatePerKm: null }, user)).toEqual(
		0.99
	);
});

test("Prisma.Decimal distance/duration inputs produce plain-number outputs", () => {
	const activity = getTripActivity("a1", "09:00", {
		distanceToClient: 10,
		travelTimeToClient: 12
	});

	const result = calculateTripTransit([activity], []);
	const values = result.get("a1");

	expect(typeof values?.transitDistance).toBe("number");
	expect(typeof values?.transitDuration).toBe("number");
});

test("sortActivitiesByTime: sorts by startTime, null startTimes last", () => {
	const a = { startTime: dayjs.utc("1970-01-01T10:00").toDate() };
	const b = { startTime: dayjs.utc("1970-01-01T09:00").toDate() };
	const c = { startTime: null };

	expect(sortActivitiesByTime([a, b, c])).toEqual([b, a, c]);
});
