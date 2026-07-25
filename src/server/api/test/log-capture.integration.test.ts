import prisma from "@/server/prisma";
import type { User } from "@/generated/client";
import { beforeEach, describe, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

const DAY = new Date("2024-01-01");

async function createClients(owner: User, count: number) {
	return Promise.all(
		Array.from({ length: count }, (_, index) =>
			prisma.client.create({
				data: { name: `Client ${index + 1}`, ownerId: owner.id }
			})
		)
	);
}

describe("log.start", () => {
	test("opens a Session with the start time stamped and the chosen Client as participant", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.id).toBe(session.id);
		expect(persisted.startTime).toEqual(new Date("1970-01-01T09:00:00Z"));
		expect(persisted.endTime).toBeNull();
		expect(persisted.participants.map((p) => p.clientId)).toEqual([client.id]);
	});

	test("starting the next Client auto-closes the Open Session at the new start time", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		const morning = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id]
		});
		await caller.log.start({
			date: DAY,
			startTime: "10:30",
			clientIds: [second.id]
		});

		const sessions = await caller.log.listByDay({ date: DAY });
		expect(sessions).toHaveLength(2);
		expect(sessions[0].id).toBe(morning.id);
		expect(sessions[0].endTime).toEqual(new Date("1970-01-01T10:30:00Z"));
		expect(sessions[1].endTime).toBeNull();
	});

	test("replaying a start with the same client-generated id does not duplicate the Session", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const capture = {
			id: "offline-cuid-1",
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		};
		await caller.log.start(capture);
		await caller.log.start(capture);

		const sessions = await caller.log.listByDay({ date: DAY });
		expect(sessions).toHaveLength(1);
		expect(sessions[0].id).toBe("offline-cuid-1");
	});

	test("rejects a start earlier than the Open Session's start time", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id]
		});

		await expect(
			caller.log.start({
				date: DAY,
				startTime: "08:00",
				clientIds: [second.id]
			})
		).rejects.toThrow(/open session/i);
	});

	test("rejects a start while a Session from another day is still Open", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		await caller.log.start({
			date: new Date("2023-12-31"),
			startTime: "09:00",
			clientIds: [first.id]
		});

		await expect(
			caller.log.start({
				date: DAY,
				startTime: "09:00",
				clientIds: [second.id]
			})
		).rejects.toThrow(/open session/i);
	});

	test("end stamps the finish time at the moment the Provider stopped", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});
		await caller.log.end({ id: session.id, endTime: "11:15" });

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.endTime).toEqual(new Date("1970-01-01T11:15:00Z"));
	});

	test("last write wins on end too - a delayed end replay never clobbers a newer edit", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id],
			updatedAt: new Date("2024-01-01T09:00:00Z")
		});
		await caller.log.edit({
			id: session.id,
			date: DAY,
			startTime: "09:00",
			endTime: "11:30",
			clientIds: [client.id],
			updatedAt: new Date("2024-01-01T12:00:00Z")
		});

		// A stale offline end replay stamped before the edit above.
		await caller.log.end({
			id: session.id,
			endTime: "11:00",
			updatedAt: new Date("2024-01-01T11:00:00Z")
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.endTime).toEqual(new Date("1970-01-01T11:30:00Z"));
	});

	test("end rejects a finish time at or before the start - Sessions can't cross midnight", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});

		await expect(
			caller.log.end({ id: session.id, endTime: "09:00" })
		).rejects.toThrow(/after/i);
	});

	test("rejects a Client belonging to another Provider", async () => {
		const owner = await createTestUser();
		const other = await createTestUser("Other Provider");
		const caller = callerFor(owner);
		const [foreignClient] = await createClients(other, 1);

		await expect(
			caller.log.start({
				date: DAY,
				startTime: "09:00",
				clientIds: [foreignClient.id]
			})
		).rejects.toThrow();
	});
});

describe("log.edit", () => {
	test("corrects any field of a captured Session", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id]
		});
		await caller.log.end({ id: session.id, endTime: "10:00" });

		await caller.log.edit({
			id: session.id,
			date: DAY,
			startTime: "09:30",
			endTime: "10:45",
			clientIds: [second.id]
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.startTime).toEqual(new Date("1970-01-01T09:30:00Z"));
		expect(persisted.endTime).toEqual(new Date("1970-01-01T10:45:00Z"));
		expect(persisted.participants.map((p) => p.clientId)).toEqual([second.id]);
	});

	test("corrects a mistyped trip and cost by replacing the Session's transport items", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});
		await caller.log.recordTrip({ workSessionId: session.id, distance: 12 });
		await caller.log.recordCost({
			workSessionId: session.id,
			type: "PARKING",
			amount: 80
		});

		await caller.log.edit({
			id: session.id,
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id],
			transportItems: [{ type: "PARKING", amount: 8 }]
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.transportItems).toHaveLength(1);
		expect(Number(persisted.transportItems[0].amount)).toBe(8);
	});

	test("an edit that omits transportItems leaves the captured trips and costs alone", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});
		await caller.log.recordTrip({ workSessionId: session.id, distance: 12 });

		await caller.log.edit({
			id: session.id,
			date: DAY,
			startTime: "09:30",
			clientIds: [client.id]
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.transportItems).toHaveLength(1);
	});

	test("backfills a past-dated Session with typed times as an upsert", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		await caller.log.edit({
			id: "backfilled-cuid",
			date: new Date("2023-12-20"),
			startTime: "13:00",
			endTime: "14:00",
			clientIds: [client.id]
		});

		const sessions = await caller.log.listByDay({
			date: new Date("2023-12-20")
		});
		expect(sessions).toHaveLength(1);
		expect(sessions[0].id).toBe("backfilled-cuid");
		expect(sessions[0].endTime).toEqual(new Date("1970-01-01T14:00:00Z"));
	});

	test("last write wins - a replayed edit older than the stored record is ignored", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id],
			updatedAt: new Date("2024-01-01T09:00:00Z")
		});
		await caller.log.edit({
			id: session.id,
			date: DAY,
			startTime: "09:15",
			endTime: "10:00",
			clientIds: [client.id],
			updatedAt: new Date("2024-01-01T12:00:00Z")
		});

		// A stale offline replay stamped before the edit above.
		await caller.log.edit({
			id: session.id,
			date: DAY,
			startTime: "08:00",
			endTime: "08:30",
			clientIds: [client.id],
			updatedAt: new Date("2024-01-01T11:00:00Z")
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.startTime).toEqual(new Date("1970-01-01T09:15:00Z"));
	});

	test("rejects an end time at or before the start time", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		await expect(
			caller.log.edit({
				id: "any-id",
				date: DAY,
				startTime: "10:00",
				endTime: "09:00",
				clientIds: [client.id]
			})
		).rejects.toThrow(/after/i);
	});

	test("rejects an edit that would leave a second Session Open", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id]
		});

		await expect(
			caller.log.edit({
				id: "backfilled-open",
				date: DAY,
				startTime: "07:00",
				endTime: null,
				clientIds: [second.id]
			})
		).rejects.toThrow(/already open/i);
	});

	test("an edit may leave its own Session Open", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});
		await caller.log.edit({
			id: session.id,
			date: DAY,
			startTime: "09:15",
			endTime: null,
			clientIds: [client.id]
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.startTime).toEqual(new Date("1970-01-01T09:15:00Z"));
		expect(persisted.endTime).toBeNull();
	});
});

describe("log.addParticipant / log.removeParticipant", () => {
	test("adding a participant part-way splits at the pivot: solo Session closes, group Session opens in place", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice, bob] = await createClients(owner, 2);

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

		const sessions = await caller.log.listByDay({ date: DAY });
		expect(sessions).toHaveLength(2);

		const [closed, opened] = sessions;
		expect(closed.id).toBe(solo.id);
		expect(closed.endTime).toEqual(new Date("1970-01-01T10:00:00Z"));
		expect(closed.participants.map((p) => p.clientId)).toEqual([alice.id]);

		expect(opened.id).toBe(group.id);
		expect(opened.startTime).toEqual(new Date("1970-01-01T10:00:00Z"));
		expect(opened.endTime).toBeNull();
		expect(new Set(opened.participants.map((p) => p.clientId))).toEqual(
			new Set([alice.id, bob.id])
		);
		expect(opened.precededByWorkSessionId).toBe(solo.id);
		expect(opened.handoverType).toBe("IN_PLACE");
		expect(opened.interClientDistance).toBeNull();
	});

	test("removing a participant part-way splits the group back to solo", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice, bob] = await createClients(owner, 2);

		const group = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id, bob.id]
		});
		await caller.log.removeParticipant({
			workSessionId: group.id,
			clientId: bob.id,
			at: "10:30"
		});

		const sessions = await caller.log.listByDay({ date: DAY });
		expect(sessions).toHaveLength(2);
		expect(sessions[0].endTime).toEqual(new Date("1970-01-01T10:30:00Z"));
		expect(sessions[1].participants.map((p) => p.clientId)).toEqual([alice.id]);
		expect(sessions[1].handoverType).toBe("IN_PLACE");
	});

	test("rejects removing the only participant", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice] = await createClients(owner, 1);

		const solo = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});

		await expect(
			caller.log.removeParticipant({
				workSessionId: solo.id,
				clientId: alice.id,
				at: "10:00"
			})
		).rejects.toThrow(/at least one/i);
	});

	test("rejects adding a Client already in the Session", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice] = await createClients(owner, 1);

		const solo = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});

		await expect(
			caller.log.addParticipant({
				workSessionId: solo.id,
				clientId: alice.id,
				at: "10:00"
			})
		).rejects.toThrow(/already/i);
	});

	test("rejects a composition change on a Session that has already ended", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice, bob] = await createClients(owner, 2);

		const solo = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});
		await caller.log.end({ id: solo.id, endTime: "10:00" });

		await expect(
			caller.log.addParticipant({
				workSessionId: solo.id,
				clientId: bob.id,
				at: "09:30"
			})
		).rejects.toThrow(/open/i);
	});

	test("last write wins - a stale split replay never clobbers a newer edit", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice, bob] = await createClients(owner, 2);

		const solo = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id],
			updatedAt: new Date("2024-01-01T09:00:00Z")
		});
		await caller.log.edit({
			id: solo.id,
			date: DAY,
			startTime: "09:15",
			endTime: null,
			clientIds: [alice.id],
			updatedAt: new Date("2024-01-01T12:00:00Z")
		});

		// A stale offline split replay stamped before the edit above.
		const replayed = await caller.log.addParticipant({
			workSessionId: solo.id,
			clientId: bob.id,
			at: "10:00",
			newWorkSessionId: "stale-split",
			updatedAt: new Date("2024-01-01T10:00:00Z")
		});

		expect(replayed.id).toBe(solo.id);
		const sessions = await caller.log.listByDay({ date: DAY });
		expect(sessions).toHaveLength(1);
		expect(sessions[0].endTime).toBeNull();
	});

	test("replaying an addParticipant with the same new-Session id does not split twice", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice, bob] = await createClients(owner, 2);

		const solo = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});
		const capture = {
			workSessionId: solo.id,
			clientId: bob.id,
			at: "10:00",
			newWorkSessionId: "offline-split-1"
		};
		await caller.log.addParticipant(capture);
		await caller.log.addParticipant(capture);

		expect(await caller.log.listByDay({ date: DAY })).toHaveLength(2);
	});
});

describe("log.recordTrip / log.recordCost", () => {
	test("a support visit with several outings captures every trip and cost on the Session", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});

		await caller.log.recordTrip({
			workSessionId: session.id,
			distance: 12.5,
			note: "to the pool"
		});
		await caller.log.recordTrip({ workSessionId: session.id, distance: 3 });
		await caller.log.recordCost({
			workSessionId: session.id,
			type: "PARKING",
			amount: 8.4
		});
		await caller.log.recordCost({
			workSessionId: session.id,
			type: "TOLL",
			amount: 5.9
		});

		const [persisted] = await caller.log.listByDay({ date: DAY });
		const byType = (type: string) =>
			persisted.transportItems.filter((item) => item.type === type);
		expect(byType("DISTANCE").map((item) => Number(item.amount))).toEqual([
			12.5, 3
		]);
		expect(byType("DISTANCE")[0].note).toBe("to the pool");
		expect(byType("PARKING").map((item) => Number(item.amount))).toEqual([8.4]);
		expect(byType("TOLL").map((item) => Number(item.amount))).toEqual([5.9]);
	});

	test("replaying a trip capture with the same client-generated id does not duplicate it", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});

		const capture = {
			id: "offline-trip-1",
			workSessionId: session.id,
			distance: 12.5
		};
		await caller.log.recordTrip(capture);
		await caller.log.recordTrip(capture);

		const [persisted] = await caller.log.listByDay({ date: DAY });
		expect(persisted.transportItems).toHaveLength(1);
	});

	test("cannot record a trip on another Provider's Session", async () => {
		const owner = await createTestUser();
		const other = await createTestUser("Other Provider");
		const [client] = await createClients(owner, 1);

		const session = await callerFor(owner).log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});

		await expect(
			callerFor(other).log.recordTrip({
				workSessionId: session.id,
				distance: 5
			})
		).rejects.toThrow();
	});
});

describe("log.captureHandover", () => {
	async function twoSessions(
		caller: ReturnType<typeof callerFor>,
		owner: User
	) {
		const [first, second] = await createClients(owner, 2);
		const morning = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id]
		});
		await caller.log.end({ id: morning.id, endTime: "11:00" });
		const afternoon = await caller.log.start({
			date: DAY,
			startTime: "11:20",
			clientIds: [second.id]
		});
		return { morning, afternoon };
	}

	test("a travel Handover records the driven distance and pre-fills the duration from the gap", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { morning, afternoon } = await twoSessions(caller, owner);

		const result = await caller.log.captureHandover({
			workSessionId: afternoon.id,
			precededByWorkSessionId: morning.id,
			handoverType: "TRAVEL",
			interClientDistance: 14
		});

		expect(result.exceedsGap).toBe(false);
		expect(result.defaultDuration).toBe(20);

		const sessions = await caller.log.listByDay({ date: DAY });
		const linked = sessions.find((s) => s.id === afternoon.id);
		expect(linked?.precededByWorkSessionId).toBe(morning.id);
		expect(linked?.handoverType).toBe("TRAVEL");
		expect(Number(linked?.interClientDistance)).toBe(14);
		expect(linked?.interClientDuration).toBeNull();
	});

	test("an entered duration longer than the gap warns but is never blocked", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { morning, afternoon } = await twoSessions(caller, owner);

		const result = await caller.log.captureHandover({
			workSessionId: afternoon.id,
			precededByWorkSessionId: morning.id,
			handoverType: "TRAVEL",
			interClientDistance: 14,
			interClientDuration: 45
		});

		expect(result.exceedsGap).toBe(true);

		const sessions = await caller.log.listByDay({ date: DAY });
		const linked = sessions.find((s) => s.id === afternoon.id);
		expect(Number(linked?.interClientDuration)).toBe(45);
	});

	test("last write wins - a stale handover replay never clobbers a newer edit", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		const morning = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id],
			updatedAt: new Date("2024-01-01T09:00:00Z")
		});
		await caller.log.end({
			id: morning.id,
			endTime: "11:00",
			updatedAt: new Date("2024-01-01T11:00:00Z")
		});
		const afternoon = await caller.log.start({
			date: DAY,
			startTime: "11:20",
			clientIds: [second.id],
			updatedAt: new Date("2024-01-01T11:20:00Z")
		});
		await caller.log.edit({
			id: afternoon.id,
			date: DAY,
			startTime: "11:30",
			endTime: "13:00",
			clientIds: [second.id],
			updatedAt: new Date("2024-01-01T12:00:00Z")
		});

		// A stale offline handover replay stamped before the edit above.
		const result = await caller.log.captureHandover({
			workSessionId: afternoon.id,
			precededByWorkSessionId: morning.id,
			handoverType: "TRAVEL",
			interClientDistance: 14,
			updatedAt: new Date("2024-01-01T11:20:00Z")
		});

		expect(result.workSession.handoverType).toBeNull();
		const sessions = await caller.log.listByDay({ date: DAY });
		const linked = sessions.find((s) => s.id === afternoon.id);
		expect(linked?.precededByWorkSessionId).toBeNull();
		expect(linked?.interClientDistance).toBeNull();
	});

	test("rejects a travel Handover without a distance", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const { morning, afternoon } = await twoSessions(caller, owner);

		await expect(
			caller.log.captureHandover({
				workSessionId: afternoon.id,
				precededByWorkSessionId: morning.id,
				handoverType: "TRAVEL"
			})
		).rejects.toThrow(/distance/i);
	});

	test("rejects a Handover from a Session that is still Open", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		const open = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id]
		});
		const backfilled = await caller.log.edit({
			id: "later-session",
			date: DAY,
			startTime: "13:00",
			endTime: "14:00",
			clientIds: [second.id]
		});

		await expect(
			caller.log.captureHandover({
				workSessionId: backfilled!.id,
				precededByWorkSessionId: open.id,
				handoverType: "TRAVEL",
				interClientDistance: 5
			})
		).rejects.toThrow(/open/i);
	});
});

describe("log.listByClient", () => {
	test("returns a section per active Client, kept even when it has no Sessions, with group Sessions under every participant", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice, bob, carol] = await createClients(owner, 3);
		await prisma.client.create({
			data: { name: "Departed", ownerId: owner.id, active: false }
		});

		const group = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id, bob.id]
		});

		const sections = await caller.log.listByClient();

		expect(sections.map((s) => s.client.id)).toEqual([
			alice.id,
			bob.id,
			carol.id
		]);
		expect(sections[0].sessions.map((s) => s.id)).toEqual([group.id]);
		expect(sections[1].sessions.map((s) => s.id)).toEqual([group.id]);
		expect(sections[2].sessions).toEqual([]);
	});

	test("a deactivated Client keeps their section while unpromoted Sessions remain", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [alice] = await createClients(owner, 1);

		await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [alice.id]
		});
		await prisma.client.update({
			where: { id: alice.id },
			data: { active: false }
		});

		const sections = await caller.log.listByClient();
		expect(sections.map((s) => s.client.id)).toEqual([alice.id]);
		expect(sections[0].sessions).toHaveLength(1);
	});
});

describe("log.delete", () => {
	test("removes a mistaken Session, and a replayed delete is a no-op", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [client] = await createClients(owner, 1);

		const session = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});

		await caller.log.delete({ id: session.id });
		await caller.log.delete({ id: session.id });

		expect(await caller.log.listByDay({ date: DAY })).toHaveLength(0);
	});

	test("cannot delete another Provider's Session", async () => {
		const owner = await createTestUser();
		const other = await createTestUser("Other Provider");
		const [client] = await createClients(owner, 1);

		const session = await callerFor(owner).log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [client.id]
		});

		await callerFor(other).log.delete({ id: session.id });
		expect(await callerFor(owner).log.listByDay({ date: DAY })).toHaveLength(1);
	});
});

// The offline sync client replays taps in order, each stamped with its tap
// time. Any write that lets @updatedAt default to sync-arrival time would
// make the row look newer than every later-queued tap, and last-write-wins
// would silently drop those replays - so every WorkSession-touching mutation
// must carry the stamp through.
describe("tap-time stamping across queued replays", () => {
	test("a stamped end still applies after captureHandover synced before it", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second] = await createClients(owner, 2);

		const morning = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id],
			updatedAt: new Date("2024-01-01T09:00:00Z")
		});
		await caller.log.end({
			id: morning.id,
			endTime: "10:00",
			updatedAt: new Date("2024-01-01T10:00:00Z")
		});
		const next = await caller.log.start({
			date: DAY,
			startTime: "10:20",
			clientIds: [second.id],
			updatedAt: new Date("2024-01-01T10:20:00Z")
		});
		await caller.log.captureHandover({
			workSessionId: next.id,
			precededByWorkSessionId: morning.id,
			handoverType: "TRAVEL",
			interClientDistance: 12,
			interClientDuration: 20,
			updatedAt: new Date("2024-01-01T10:20:30Z")
		});

		// The end was tapped after the handover, so its stamp is newer than
		// the handover's - it must never be dropped as stale.
		await caller.log.end({
			id: next.id,
			endTime: "11:00",
			updatedAt: new Date("2024-01-01T11:00:00Z")
		});

		const sessions = await caller.log.listByDay({ date: DAY });
		expect(sessions[1].endTime).toEqual(new Date("1970-01-01T11:00:00Z"));
	});

	test("stamped writes still apply after an auto-close and a participant split", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const [first, second, third] = await createClients(owner, 3);

		const morning = await caller.log.start({
			date: DAY,
			startTime: "09:00",
			clientIds: [first.id],
			updatedAt: new Date("2024-01-01T09:00:00Z")
		});
		// Auto-closes the morning Session - stamped with this tap's time.
		await caller.log.start({
			date: DAY,
			startTime: "10:00",
			clientIds: [second.id],
			updatedAt: new Date("2024-01-01T10:00:00Z")
		});

		// A later-stamped correction of the auto-closed Session must apply.
		await caller.log.edit({
			id: morning.id,
			date: DAY,
			startTime: "09:15",
			endTime: "10:00",
			clientIds: [first.id],
			updatedAt: new Date("2024-01-01T10:05:00Z")
		});

		const open = await caller.log.listByDay({ date: DAY });
		const grown = await caller.log.addParticipant({
			workSessionId: open[1].id,
			clientId: third.id,
			at: "10:30",
			newWorkSessionId: undefined,
			updatedAt: new Date("2024-01-01T10:30:00Z")
		});

		// Ending the Session the split opened, stamped after the split.
		await caller.log.end({
			id: grown.id,
			endTime: "11:00",
			updatedAt: new Date("2024-01-01T11:00:00Z")
		});

		const sessions = await caller.log.listByDay({ date: DAY });
		expect(sessions[0].startTime).toEqual(new Date("1970-01-01T09:15:00Z"));
		expect(sessions[2].endTime).toEqual(new Date("1970-01-01T11:00:00Z"));
	});
});
