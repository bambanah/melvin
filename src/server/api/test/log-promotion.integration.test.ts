import prisma from "@/server/prisma";
import { beforeEach, describe, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

const DAY = new Date("2024-01-01");

// A Provider with default solo/group Support Items and two Clients with
// stored home distances — the standing setup Promotion draws on.
async function createProviderFixture() {
	const owner = await createTestUser();

	const soloItem = await prisma.supportItem.create({
		data: {
			description: "Self-Care Standard",
			weekdayCode: "01_011_0107_1_1",
			weekdayRate: 65.09,
			ownerId: owner.id
		}
	});
	const groupItem = await prisma.supportItem.create({
		data: {
			description: "Group Activities Standard",
			isGroup: true,
			weekdayCode: "04_102_0136_6_1",
			weekdayRate: 70.2,
			ownerId: owner.id
		}
	});
	await prisma.user.update({
		where: { id: owner.id },
		data: {
			defaultSupportItemId: soloItem.id,
			defaultGroupSupportItemId: groupItem.id
		}
	});

	const clients = await Promise.all(
		[
			{ name: "Alice", distanceToClient: 10, travelTimeToClient: 12 },
			{ name: "Bob", distanceToClient: 6, travelTimeToClient: 8 },
			{ name: "Carol", distanceToClient: 4, travelTimeToClient: 5 }
		].map((data) =>
			prisma.client.create({ data: { ...data, ownerId: owner.id } })
		)
	);

	return { owner, soloItem, groupItem, clients };
}

describe("log.promoteDay", () => {
	test("a day of two solo Sessions with a travel Handover becomes pending Activities and a Trip with the handover leg", async () => {
		const { owner, soloItem, clients } = await createProviderFixture();
		const caller = callerFor(owner);
		const [alice, bob] = clients;

		const morning = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});
		await caller.log.end({ id: morning.id, endTime: "11:00" });
		const afternoon = await caller.log.start({
			date: DAY,
			startTime: "11:20",
			clientIds: [bob.id]
		});
		await caller.log.captureHandover({
			workSessionId: afternoon.id,
			precededByWorkSessionId: morning.id,
			handoverType: "TRAVEL",
			interClientDistance: 14
		});
		await caller.log.end({ id: afternoon.id, endTime: "13:00" });

		await caller.log.promoteDay({ date: DAY });

		// Sessions are ephemeral: promoted work leaves the Log entirely.
		expect(await prisma.workSession.count()).toBe(0);

		const activities = await prisma.activity.findMany({
			where: { ownerId: owner.id },
			orderBy: { startTime: "asc" },
			include: { transportItems: true }
		});
		expect(activities).toHaveLength(2);
		for (const activity of activities) {
			expect(activity.invoiceId).toBeNull();
			expect(activity.supportItemId).toBe(soloItem.id);
			expect(activity.date).toEqual(DAY);
			expect(activity.groupSize).toBeNull();
		}
		expect(activities[0].clientId).toBe(alice.id);
		expect(activities[0].startTime).toEqual(new Date("1970-01-01T09:00:00Z"));
		expect(activities[0].endTime).toEqual(new Date("1970-01-01T11:00:00Z"));
		expect(activities[1].clientId).toBe(bob.id);

		const trip = await prisma.trip.findFirstOrThrow({
			where: { ownerId: owner.id },
			include: { interClientLegs: true, activities: true }
		});
		expect(trip.date).toEqual(DAY);
		expect(trip.activities.map((a) => a.id).sort()).toEqual(
			activities.map((a) => a.id).sort()
		);
		expect(trip.interClientLegs).toHaveLength(1);
		expect(trip.interClientLegs[0]).toMatchObject({
			fromActivityId: activities[0].id,
			toActivityId: activities[1].id
		});
		expect(Number(trip.interClientLegs[0].distance)).toBe(14);
		// Duration defaulted from the 20-minute gap between the stamped times.
		expect(Number(trip.interClientLegs[0].duration)).toBe(20);

		// Home legs derive from the Clients' stored distances, exactly as the
		// trip machinery allocates them: first gets the drive out, last gets the
		// inter-client leg plus the drive home.
		expect(Number(activities[0].transitDistance)).toBe(10);
		expect(Number(activities[0].transitDuration)).toBe(12);
		expect(Number(activities[1].transitDistance)).toBe(14 + 6);
		expect(Number(activities[1].transitDuration)).toBe(20 + 8);
	});

	test("a group Session becomes one mirrored Activity per participant sharing a groupSize, with transport and travel billed once", async () => {
		const { owner, groupItem, clients } = await createProviderFixture();
		const caller = callerFor(owner);
		const [alice, bob] = clients;

		const group = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id, bob.id]
		});
		await caller.log.recordTrip({ workSessionId: group.id, distance: 7 });
		await caller.log.end({ id: group.id, endTime: "11:00" });

		await caller.log.promoteDay({ date: DAY });

		const activities = await prisma.activity.findMany({
			where: { ownerId: owner.id },
			include: { transportItems: true }
		});
		expect(activities).toHaveLength(2);
		expect(new Set(activities.map((a) => a.clientId))).toEqual(
			new Set([alice.id, bob.id])
		);
		for (const activity of activities) {
			expect(activity.supportItemId).toBe(groupItem.id);
			expect(activity.groupSize).toBe(2);
		}

		// Activity Based Transport bills once, on the primary participant.
		const withTransport = activities.filter((a) => a.transportItems.length > 0);
		expect(withTransport).toHaveLength(1);
		expect(withTransport[0].clientId).toBe(alice.id);
		expect(Number(withTransport[0].transportItems[0].amount)).toBe(7);
		expect(withTransport[0].transportItems[0].type).toBe("DISTANCE");

		// A single-Session day forms no Trip; the primary bills standalone home
		// travel from the Client's stored distance, mirrors bill none.
		expect(await prisma.trip.count()).toBe(0);
		expect(Number(withTransport[0].transitDistance)).toBe(20);
		expect(Number(withTransport[0].transitDuration)).toBe(24);
		const mirror = activities.find((a) => a.clientId === bob.id);
		expect(mirror?.transitDistance).toBeNull();
	});

	test("an add-participant day splits per composition and the pivot boundary promotes cleanly with no invented leg", async () => {
		const { owner, soloItem, groupItem, clients } =
			await createProviderFixture();
		const caller = callerFor(owner);
		const [alice, bob] = clients;

		const solo = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});
		const group = await caller.log.addParticipant({
			workSessionId: solo.id,
			clientId: bob.id,
			at: "10:00"
		});
		await caller.log.end({ id: group.id, endTime: "11:00" });

		await caller.log.promoteDay({ date: DAY });

		const activities = await prisma.activity.findMany({
			where: { ownerId: owner.id },
			orderBy: [{ startTime: "asc" }],
			include: { supportItem: true }
		});
		expect(activities).toHaveLength(3);
		expect(activities[0].supportItemId).toBe(soloItem.id);
		expect(activities[0].groupSize).toBeNull();
		expect(
			activities.slice(1).every((a) => a.supportItemId === groupItem.id)
		).toBe(true);

		// An in-place composition change captures no driving.
		expect(await prisma.interClientLeg.count()).toBe(0);
		expect(await prisma.trip.count()).toBe(1);
	});

	test("an entered travel duration longer than the gap never bills more travel than physically fit", async () => {
		const { owner, clients } = await createProviderFixture();
		const caller = callerFor(owner);
		const [alice, bob] = clients;

		const morning = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});
		await caller.log.end({ id: morning.id, endTime: "11:00" });
		const afternoon = await caller.log.start({
			date: DAY,
			startTime: "11:10",
			clientIds: [bob.id]
		});
		await caller.log.captureHandover({
			workSessionId: afternoon.id,
			precededByWorkSessionId: morning.id,
			handoverType: "TRAVEL",
			interClientDistance: 25,
			interClientDuration: 45
		});
		await caller.log.end({ id: afternoon.id, endTime: "13:00" });

		await caller.log.promoteDay({ date: DAY });

		const leg = await prisma.interClientLeg.findFirstOrThrow();
		// Duration clamps to the 10-minute gap; distance always bills in full.
		expect(Number(leg.duration)).toBe(10);
		expect(Number(leg.distance)).toBe(25);
	});

	test("a zero gap (finish 3pm, start 3pm) bills zero travel time", async () => {
		const { owner, clients } = await createProviderFixture();
		const caller = callerFor(owner);
		const [alice, bob] = clients;

		const first = await caller.log.start({
			date: DAY,
			startTime: "14:00",
			clientIds: [alice.id]
		});
		await caller.log.end({ id: first.id, endTime: "15:00" });
		const second = await caller.log.start({
			date: DAY,
			startTime: "15:00",
			clientIds: [bob.id]
		});
		await caller.log.captureHandover({
			workSessionId: second.id,
			precededByWorkSessionId: first.id,
			handoverType: "TRAVEL",
			interClientDistance: 5
		});
		await caller.log.end({ id: second.id, endTime: "16:00" });

		await caller.log.promoteDay({ date: DAY });

		const leg = await prisma.interClientLeg.findFirstOrThrow();
		expect(Number(leg.duration)).toBe(0);
		expect(Number(leg.distance)).toBe(5);
	});

	test("overriding the Support Item on a promoted Session bills the non-default support", async () => {
		const { owner, clients } = await createProviderFixture();
		const caller = callerFor(owner);
		const otherItem = await prisma.supportItem.create({
			data: {
				description: "Community Access",
				weekdayCode: "04_104_0125_6_1",
				weekdayRate: 60,
				ownerId: owner.id
			}
		});

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [clients[0].id]
		});
		await caller.log.end({ id: session.id, endTime: "10:00" });

		await caller.log.promoteDay({
			date: DAY,
			supportItemOverrides: { [session.id]: otherItem.id }
		});

		const activity = await prisma.activity.findFirstOrThrow();
		expect(activity.supportItemId).toBe(otherItem.id);
	});

	test("promoting one day leaves other days' Sessions in the Log", async () => {
		const { owner, clients } = await createProviderFixture();
		const caller = callerFor(owner);
		const otherDay = new Date("2024-01-02");

		await caller.log.edit({
			id: "day-one",
			date: DAY,
			startTime: "09:00",
			endTime: "10:00",
			clientIds: [clients[0].id]
		});
		await caller.log.edit({
			id: "day-two",
			date: otherDay,
			startTime: "09:00",
			endTime: "10:00",
			clientIds: [clients[0].id]
		});

		await caller.log.promoteDay({ date: DAY });

		expect(await prisma.workSession.count()).toBe(1);
		expect(await caller.log.listByDay({ date: otherDay })).toHaveLength(1);
	});

	test("promotion without a default Support Item is rejected and changes nothing", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const client = await prisma.client.create({
			data: { name: "Alice", ownerId: owner.id }
		});

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});
		await caller.log.end({ id: session.id, endTime: "10:00" });

		await expect(caller.log.promoteDay({ date: DAY })).rejects.toThrow(
			/default support item/i
		);
		expect(await prisma.activity.count()).toBe(0);
		expect(await prisma.workSession.count()).toBe(1);
	});

	test("Promotion is blocked while any Session that day is still Open", async () => {
		const { owner, clients } = await createProviderFixture();
		const caller = callerFor(owner);

		await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [clients[0].id]
		});

		await expect(caller.log.promoteDay({ date: DAY })).rejects.toThrow(/open/i);
		expect(await prisma.activity.count()).toBe(0);
		expect(await prisma.workSession.count()).toBe(1);
	});

	test("promoting a day with no Sessions is rejected", async () => {
		const { owner } = await createProviderFixture();

		await expect(
			callerFor(owner).log.promoteDay({ date: DAY })
		).rejects.toThrow(/no sessions/i);
	});
});
