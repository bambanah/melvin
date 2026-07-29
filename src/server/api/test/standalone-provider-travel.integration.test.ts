import prisma from "@/server/prisma";
import type { User } from "@/generated/client";
import { beforeEach, describe, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

/**
 * One invariant, checked on every path that can create an Activity: an Activity
 * that stands alone on its day bills the return trip home → Client → home, with
 * the Travel Time Cap applied to each leg. Trip allocation is the deliberate
 * exception - a Trip's legs share the day's driving, so only its last leg
 * carries a drive home - and `trip-lifecycle.integration.test.ts` pins that
 * down. These tests exist because the two rules were each re-derived per path
 * and drifted: several paths billed a single leg, or none at all.
 *
 * The paths covered elsewhere: `log.promoteDay` in
 * `log-promotion.integration.test.ts`, dropping an Activity out of a Trip in
 * `trip-lifecycle.integration.test.ts`, and `activity.add` in
 * `activity-router.integration.test.ts` - it stores the travel the single-
 * activity form submits verbatim, and the form derives it with
 * `standaloneTravelDefaults` (unit-tested in `activity-form-model.test.ts`).
 */

beforeEach(async () => {
	await resetDb();
});

// 55 minutes each way, so each leg caps to 30: the return trip is 80 km / 60 min
// and a path that bills one leg shows up as 40 km / 55 min.
const STORED_TRAVEL = { distanceToClient: 40, travelTimeToClient: 55 };
const RETURN_TRIP = { transitDistance: 80, transitDuration: 60 };

async function createSupportItem(owner: User, isGroup = false) {
	return prisma.supportItem.create({
		data: {
			description: isGroup ? "Group Support" : "Support",
			isGroup,
			weekdayCode: isGroup ? "04_102_0136_6_1" : "01_011_0107_1_1",
			weekdayRate: 100,
			ownerId: owner.id
		}
	});
}

async function createClient(owner: User, name: string, travel = STORED_TRAVEL) {
	return prisma.client.create({
		data: { name, ownerId: owner.id, ...travel }
	});
}

const travelOf = (activity: {
	transitDistance: unknown;
	transitDuration: unknown;
}) => ({
	transitDistance: Number(activity.transitDistance),
	transitDuration: Number(activity.transitDuration)
});

describe("activity.bulkAdd", () => {
	test("a lone Activity bills the return trip, not one leg", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await createClient(owner, "Client 1");

		const { activities, tripId } = await caller.activity.bulkAdd({
			activities: [
				{
					clientId: client.id,
					supportItemId: supportItem.id,
					date: new Date("2024-01-01"),
					startTime: "09:00",
					endTime: "10:00"
				}
			]
		});

		expect(tripId).toBeNull();
		expect(travelOf(activities[0])).toEqual(RETURN_TRIP);
	});

	test("transit entered by hand on a lone Activity is not overwritten", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await createClient(owner, "Client 1");

		const { activities } = await caller.activity.bulkAdd({
			activities: [
				{
					clientId: client.id,
					supportItemId: supportItem.id,
					date: new Date("2024-01-01"),
					startTime: "09:00",
					endTime: "10:00",
					transitDistance: "42",
					transitDuration: "17"
				}
			]
		});

		expect(travelOf(activities[0])).toEqual({
			transitDistance: 42,
			transitDuration: 17
		});
	});

	test("a Client with no stored travel bills no provider travel", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await prisma.client.create({
			data: { name: "No travel", ownerId: owner.id }
		});

		const { activities } = await caller.activity.bulkAdd({
			activities: [
				{
					clientId: client.id,
					supportItemId: supportItem.id,
					date: new Date("2024-01-01"),
					startTime: "09:00",
					endTime: "10:00"
				}
			]
		});

		const saved = await prisma.activity.findUniqueOrThrow({
			where: { id: activities[0].id }
		});
		expect(Number(saved.transitDistance)).toBe(0);
		expect(Number(saved.transitDuration)).toBe(0);
	});
});

describe("invoice.create", () => {
	test("an Activity created on the invoice bills the return trip", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await createClient(owner, "Client 1");

		const invoice = await caller.invoice.create({
			invoice: {
				clientId: client.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					{
						supportItemId: supportItem.id,
						groupClientIds: [],
						activities: [
							{
								date: new Date("2024-01-01"),
								startTime: "09:00",
								endTime: "11:00"
							}
						]
					}
				]
			}
		});

		const activities = await prisma.activity.findMany({
			where: { invoiceId: invoice.id }
		});

		expect(activities).toHaveLength(1);
		expect(travelOf(activities[0])).toEqual(RETURN_TRIP);
	});

	test("each mirrored group participant bills its own return trip", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner, true);
		const primary = await createClient(owner, "Primary");
		const other = await createClient(owner, "Other", {
			distanceToClient: 6,
			travelTimeToClient: 12
		});

		await caller.invoice.create({
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					{
						supportItemId: supportItem.id,
						groupClientIds: [other.id],
						activities: [
							{
								date: new Date("2024-01-01"),
								startTime: "09:00",
								endTime: "11:00"
							}
						]
					}
				]
			}
		});

		const byClient = new Map(
			(await prisma.activity.findMany({ where: { ownerId: owner.id } })).map(
				(activity) => [activity.clientId, travelOf(activity)]
			)
		);

		expect(byClient.get(primary.id)).toEqual(RETURN_TRIP);
		expect(byClient.get(other.id)).toEqual({
			transitDistance: 12,
			transitDuration: 24
		});
	});

	test("a Client with no stored travel leaves the created Activity's travel unset", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await prisma.client.create({
			data: { name: "No travel", ownerId: owner.id }
		});

		const invoice = await caller.invoice.create({
			invoice: {
				clientId: client.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					{
						supportItemId: supportItem.id,
						groupClientIds: [],
						activities: [
							{
								date: new Date("2024-01-01"),
								startTime: "09:00",
								endTime: "11:00"
							}
						]
					}
				]
			}
		});

		const [activity] = await prisma.activity.findMany({
			where: { invoiceId: invoice.id }
		});

		expect(activity.transitDistance).toBeNull();
		expect(activity.transitDuration).toBeNull();
	});
});
