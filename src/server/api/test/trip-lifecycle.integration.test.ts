import { calculateTripTransit, type TripActivity } from "@/lib/trip-utils";
import prisma from "@/server/prisma";
import type { User } from "@/generated/client";
import { beforeEach, describe, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

const CLIENT_TRANSIT = [
	{ distanceToClient: 5, travelTimeToClient: 10 },
	{ distanceToClient: 8, travelTimeToClient: 15 },
	{ distanceToClient: 6, travelTimeToClient: 12 }
];

async function createTripFixture(owner: User) {
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: owner.id
		}
	});

	const clients = await Promise.all(
		CLIENT_TRANSIT.map(({ distanceToClient, travelTimeToClient }, index) =>
			prisma.client.create({
				data: {
					name: `Client ${index + 1}`,
					ownerId: owner.id,
					distanceToClient,
					travelTimeToClient
				}
			})
		)
	);

	const timeRanges = [
		["2024-01-01T09:00:00.000Z", "2024-01-01T10:00:00.000Z"],
		["2024-01-01T10:00:00.000Z", "2024-01-01T11:00:00.000Z"],
		["2024-01-01T11:00:00.000Z", "2024-01-01T12:00:00.000Z"]
	];

	const activities = await Promise.all(
		clients.map((client, index) =>
			prisma.activity.create({
				data: {
					date: new Date("2024-01-01"),
					startTime: new Date(timeRanges[index][0]),
					endTime: new Date(timeRanges[index][1]),
					ownerId: owner.id,
					clientId: client.id,
					supportItemId: supportItem.id
				}
			})
		)
	);

	return { supportItem, clients, activities };
}

const tripActivitySelect = {
	id: true,
	startTime: true,
	endTime: true,
	transitDistance: true,
	transitDuration: true,
	client: {
		select: {
			distanceToClient: true,
			travelTimeToClient: true,
			transitRatePerKm: true
		}
	}
} as const;

async function fetchTripActivities(ids: string[]): Promise<TripActivity[]> {
	return prisma.activity.findMany({
		where: { id: { in: ids } },
		select: tripActivitySelect
	});
}

describe("trip.create", () => {
	test("persists transitDistance/transitDuration matching calculateTripTransit's allocation", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { activities } = await createTripFixture(owner);
		const [a1, a2, a3] = activities;

		const beforeTrip = await fetchTripActivities([a1.id, a2.id, a3.id]);
		const legs = [
			{ fromActivityId: a1.id, toActivityId: a2.id, distance: 3, duration: 5 },
			{ fromActivityId: a2.id, toActivityId: a3.id, distance: 4, duration: 6 }
		];
		const expected = calculateTripTransit(beforeTrip, legs);

		await caller.trip.create({
			date: new Date("2024-01-01"),
			activityIds: [a1.id, a2.id, a3.id],
			interClientLegs: legs
		});

		const persisted = await fetchTripActivities([a1.id, a2.id, a3.id]);
		for (const activity of persisted) {
			const expectedValues = expected.get(activity.id);
			expect(Number(activity.transitDistance)).toBe(
				expectedValues?.transitDistance
			);
			expect(Number(activity.transitDuration)).toBe(
				expectedValues?.transitDuration
			);
		}
	});
});

describe("trip.removeActivity", () => {
	test("removing the middle activity restores it to standalone values and reallocates the rest", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { clients, activities } = await createTripFixture(owner);
		const [a1, a2, a3] = activities;
		const [, client2] = clients;

		const legs = [
			{ fromActivityId: a1.id, toActivityId: a2.id, distance: 3, duration: 5 },
			{ fromActivityId: a2.id, toActivityId: a3.id, distance: 4, duration: 6 }
		];
		const trip = await caller.trip.create({
			date: new Date("2024-01-01"),
			activityIds: [a1.id, a2.id, a3.id],
			interClientLegs: legs
		});

		const result = await caller.trip.removeActivity({
			tripId: trip.id,
			activityId: a2.id
		});
		expect(result.dissolved).toBe(false);

		// NOTE: the standalone-restore formula (distanceToClient * 2,
		// travelTimeToClient * 2, uncapped) intentionally diverges from what
		// calculateTripTransit would compute for a single-activity list — the
		// uncapped-restore divergence. Asserting against the
		// router's actual formula here, not against calculateTripTransit.
		const removed = await prisma.activity.findUniqueOrThrow({
			where: { id: a2.id }
		});
		expect(removed.tripId).toBeNull();
		expect(Number(removed.transitDistance)).toBe(
			Number(client2.distanceToClient) * 2
		);
		expect(Number(removed.transitDuration)).toBe(
			Number(client2.travelTimeToClient) * 2
		);

		const remainingLegs = await prisma.interClientLeg.findMany({
			where: { tripId: trip.id }
		});
		const remaining = await fetchTripActivities([a1.id, a3.id]);
		const expected = calculateTripTransit(remaining, remainingLegs);

		for (const activity of remaining) {
			const expectedValues = expected.get(activity.id);
			expect(Number(activity.transitDistance)).toBe(
				expectedValues?.transitDistance
			);
			expect(Number(activity.transitDuration)).toBe(
				expectedValues?.transitDuration
			);
		}
	});
});

describe("trip.delete", () => {
	test("restores every activity to standalone values and clears tripId", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { clients, activities } = await createTripFixture(owner);
		const [a1, a2, a3] = activities;

		const legs = [
			{ fromActivityId: a1.id, toActivityId: a2.id, distance: 3, duration: 5 },
			{ fromActivityId: a2.id, toActivityId: a3.id, distance: 4, duration: 6 }
		];
		const trip = await caller.trip.create({
			date: new Date("2024-01-01"),
			activityIds: [a1.id, a2.id, a3.id],
			interClientLegs: legs
		});

		await caller.trip.delete({ tripId: trip.id });

		// NOTE: same uncapped-restore formula as trip.removeActivity's
		// dissolve/standalone path.
		for (const [activity, client] of [
			[a1, clients[0]],
			[a2, clients[1]],
			[a3, clients[2]]
		] as const) {
			const restored = await prisma.activity.findUniqueOrThrow({
				where: { id: activity.id }
			});
			expect(restored.tripId).toBeNull();
			expect(Number(restored.transitDistance)).toBe(
				Number(client.distanceToClient) * 2
			);
			expect(Number(restored.transitDuration)).toBe(
				Number(client.travelTimeToClient) * 2
			);
		}

		expect(await prisma.trip.findUnique({ where: { id: trip.id } })).toBeNull();
	});
});

// bulkAdd is the other path that assembles a Trip - the manual multi-activity
// form. It shares Promotion's creation path, so a day it links as a Trip has
// its Provider Travel allocated by the same engine as trip.create.
describe("activity.bulkAdd", () => {
	test("a contiguous day linked as a Trip allocates transit onto its Activities", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { supportItem, clients } = await createTripFixture(owner);
		const [first, second] = clients;

		const { tripId, activities } = await caller.activity.bulkAdd({
			activities: [
				{
					clientId: first.id,
					supportItemId: supportItem.id,
					date: new Date("2024-02-01"),
					startTime: "09:00",
					endTime: "10:00"
				},
				{
					clientId: second.id,
					supportItemId: supportItem.id,
					date: new Date("2024-02-01"),
					startTime: "10:00",
					endTime: "11:00"
				}
			],
			autoCreateTrip: true
		});

		expect(tripId).not.toBeNull();

		// Legs of a manually entered day derive from each Client's stored
		// distance: 8 km / 15 min out to the second Client.
		const trip = await prisma.trip.findUniqueOrThrow({
			where: { id: tripId as string },
			include: { interClientLegs: true }
		});
		expect(trip.interClientLegs).toHaveLength(1);
		expect(Number(trip.interClientLegs[0].distance)).toBe(8);

		const persisted = await fetchTripActivities(activities.map((a) => a.id));
		const expected = calculateTripTransit(
			persisted.map((activity) => ({
				...activity,
				transitDistance: null,
				transitDuration: null
			})),
			trip.interClientLegs
		);
		for (const activity of persisted) {
			expect(Number(activity.transitDistance)).toBe(
				expected.get(activity.id)?.transitDistance
			);
			expect(Number(activity.transitDuration)).toBe(
				expected.get(activity.id)?.transitDuration
			);
		}
		// The first Client's drive out, the second's leg in plus the drive home -
		// not the zeroes an unallocated Trip would leave behind.
		const byClient = new Map(
			(
				await prisma.activity.findMany({
					where: { id: { in: activities.map((a) => a.id) } },
					select: { clientId: true, transitDistance: true }
				})
			).map((a) => [a.clientId, Number(a.transitDistance)])
		);
		expect(byClient.get(first.id)).toBe(5);
		expect(byClient.get(second.id)).toBe(8 + 8);
	});

	test("a non-contiguous day forms no Trip and keeps hand-entered transit", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { supportItem, clients } = await createTripFixture(owner);

		const { tripId, activities } = await caller.activity.bulkAdd({
			activities: [
				{
					clientId: clients[0].id,
					supportItemId: supportItem.id,
					date: new Date("2024-02-01"),
					startTime: "09:00",
					endTime: "10:00",
					transitDistance: "42",
					transitDuration: "17"
				},
				{
					clientId: clients[1].id,
					supportItemId: supportItem.id,
					date: new Date("2024-02-01"),
					startTime: "13:00",
					endTime: "14:00"
				}
			],
			autoCreateTrip: true
		});

		expect(tripId).toBeNull();
		expect(await prisma.trip.count({ where: { ownerId: owner.id } })).toBe(0);

		const entered = await prisma.activity.findFirstOrThrow({
			where: {
				id: { in: activities.map((a) => a.id) },
				clientId: clients[0].id
			}
		});
		expect(Number(entered.transitDistance)).toBe(42);
		expect(Number(entered.transitDuration)).toBe(17);
	});
});
