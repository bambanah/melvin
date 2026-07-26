// The offline half of the Log, tested with no signal at all: every capture
// has to land in local state and queue its replay, and the guards that mirror
// the router have to reject at tap time rather than at sync time. The store
// keeps module-level state, so each test imports a fresh copy.
import type { PersistedLog } from "@/lib/log/log-db";
import type { LogOp, LogSession } from "@/lib/log/log-types";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { persisted } = vi.hoisted(() => ({
	persisted: { current: null as PersistedLog | null }
}));

vi.mock("@/lib/log/log-db", () => ({
	loadPersistedLog: async () => persisted.current,
	savePersistedLog: async (state: PersistedLog) => {
		persisted.current = state;
	}
}));

type Store = typeof import("@/lib/log/log-store");

const ALICE = "client-aaa";
const BOB = "client-zzz";

async function freshStore(seed?: PersistedLog): Promise<Store> {
	persisted.current = seed ?? null;
	vi.resetModules();
	return import("@/lib/log/log-store");
}

/** A store that has hydrated from `seed`, the way a returning tab does. */
async function hydratedStore(seed: PersistedLog): Promise<Store> {
	const store = await freshStore(seed);
	store.subscribeLog(() => {});
	await vi.waitFor(() => expect(store.getLogState().hydrated).toBe(true));
	return store;
}

const session = (overrides: Partial<LogSession> = {}): LogSession => ({
	id: "session-1",
	date: "2020-01-01",
	startTime: "09:00",
	endTime: null,
	clientIds: [ALICE],
	precededById: null,
	handoverType: null,
	interClientDistance: null,
	interClientDuration: null,
	transportItems: [],
	updatedAt: "2020-01-01T09:00:00.000Z",
	...overrides
});

const seedOf = (sessions: LogSession[]): PersistedLog => ({
	sessions,
	clients: [
		{ id: ALICE, name: "Zoe" },
		{ id: BOB, name: "Adam" }
	],
	queue: [],
	autoEnded: []
});

const queuedKinds = (store: Store) =>
	store.getLogState().queue.map((op: LogOp) => op.kind);

beforeEach(() => {
	// Every test runs with no signal: captures stay on-device and the queue
	// never drains, which is exactly the state the field cares about.
	vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
});

describe("capture", () => {
	test("a Start opens a Session locally and queues its replay", async () => {
		const store = await freshStore();

		const { session: started, previous } = store.startSession({
			clientIds: [ALICE],
			startTime: "09:00"
		});

		expect(previous).toBeNull();
		expect(store.getLogState().sessions).toEqual([started]);
		expect(started.endTime).toBeNull();
		expect(queuedKinds(store)).toEqual(["start"]);
		// The tap is stamped with the moment it happened, not the moment it syncs.
		expect(Date.parse(started.updatedAt)).toBeLessThanOrEqual(Date.now());
	});

	test("participants are stored in id order however they were tapped", async () => {
		const store = await freshStore();

		const { session: started } = store.startSession({
			clientIds: [BOB, ALICE, BOB],
			startTime: "09:00"
		});

		// Promotion bills a group Session's transport on the first participant,
		// so local order has to match the order the server reads them back in.
		expect(started.clientIds).toEqual([ALICE, BOB]);
	});

	test("starting the next Client closes the open Session and offers the handover", async () => {
		const store = await freshStore();
		const first = store.startSession({
			clientIds: [ALICE],
			startTime: "09:00"
		}).session;

		const { previous } = store.startSession({
			clientIds: [BOB],
			startTime: "10:20"
		});

		expect(previous?.id).toBe(first.id);
		const closed = store
			.getLogState()
			.sessions.find((s) => s.id === first.id) as LogSession;
		expect(closed.endTime).toBe("10:20");
		expect(store.getLogState().sessions.filter((s) => !s.endTime)).toHaveLength(
			1
		);
	});

	test("a Start before the open Session began is refused at tap time", async () => {
		const store = await freshStore();
		store.startSession({ clientIds: [ALICE], startTime: "10:00" });

		expect(() =>
			store.startSession({ clientIds: [BOB], startTime: "09:00" })
		).toThrow(/right time first/);
		expect(queuedKinds(store)).toEqual(["start"]);
	});

	test("an End at or before the Start is refused", async () => {
		const store = await freshStore();
		const started = store.startSession({
			clientIds: [ALICE],
			startTime: "09:00"
		}).session;

		expect(() => store.endSession(started.id, "09:00")).toThrow();
		expect(store.getLogState().sessions[0].endTime).toBeNull();
	});

	test("a trip and a cost attach to the Session and queue separately", async () => {
		const store = await freshStore();
		const started = store.startSession({
			clientIds: [ALICE],
			startTime: "09:00"
		}).session;

		store.recordTrip({ workSessionId: started.id, distance: 8 });
		store.recordCost({
			workSessionId: started.id,
			type: "PARKING",
			amount: 4.5
		});
		expect(() =>
			store.recordTrip({ workSessionId: started.id, distance: 0 })
		).toThrow(/positive/);

		expect(store.getLogState().sessions[0].transportItems).toMatchObject([
			{ type: "DISTANCE", amount: 8 },
			{ type: "PARKING", amount: 4.5 }
		]);
		expect(queuedKinds(store)).toEqual(["start", "recordTrip", "recordCost"]);
	});

	test("a composition change splits the Session at the pivot with no driving", async () => {
		const store = await freshStore();
		const solo = store.startSession({
			clientIds: [ALICE],
			startTime: "09:00"
		}).session;

		const group = store.changeParticipants({
			workSessionId: solo.id,
			clientId: BOB,
			at: "10:00",
			change: "add"
		});

		const sessions = store.getLogState().sessions;
		expect(sessions.find((s) => s.id === solo.id)?.endTime).toBe("10:00");
		expect(group).toMatchObject({
			startTime: "10:00",
			endTime: null,
			precededById: solo.id,
			handoverType: "IN_PLACE",
			interClientDistance: null,
			clientIds: [ALICE, BOB]
		});
		expect(queuedKinds(store)).toEqual(["start", "addParticipant"]);
	});

	test("a Session can't be left with no Clients", async () => {
		const store = await freshStore();
		const solo = store.startSession({
			clientIds: [ALICE],
			startTime: "09:00"
		}).session;

		expect(() =>
			store.changeParticipants({
				workSessionId: solo.id,
				clientId: ALICE,
				at: "10:00",
				change: "remove"
			})
		).toThrow(/at least one Client/);
	});

	test("a travel Handover needs a distance", async () => {
		const store = await hydratedStore(seedOf([session({ endTime: "10:00" })]));
		const next = store.startSession({
			clientIds: [BOB],
			startTime: "10:20"
		}).session;

		expect(() =>
			store.captureHandover({
				workSessionId: next.id,
				precededByWorkSessionId: "session-1",
				handoverType: "TRAVEL"
			})
		).toThrow(/Distance is required/);

		store.captureHandover({
			workSessionId: next.id,
			precededByWorkSessionId: "session-1",
			handoverType: "TRAVEL",
			interClientDistance: 12,
			interClientDuration: 20
		});
		expect(
			store.getLogState().sessions.find((s) => s.id === next.id)
		).toMatchObject({
			precededById: "session-1",
			handoverType: "TRAVEL",
			interClientDistance: 12,
			interClientDuration: 20
		});
	});
});

describe("editing a capture", () => {
	test("a backfilled Session that stays Open is refused while one is already Open", async () => {
		const store = await freshStore();
		store.startSession({ clientIds: [ALICE], startTime: "09:00" });

		expect(() =>
			store.editSession({
				id: null,
				date: "2020-01-01",
				startTime: "09:00",
				endTime: null,
				clientIds: [BOB]
			})
		).toThrow(/open/i);
	});

	test("a backfilled past Session lands closed and queues an edit", async () => {
		const store = await freshStore();

		store.editSession({
			id: null,
			date: "2020-01-01",
			startTime: "09:00",
			endTime: "11:00",
			clientIds: [BOB, ALICE]
		});

		expect(store.getLogState().sessions).toMatchObject([
			{ date: "2020-01-01", endTime: "11:00", clientIds: [ALICE, BOB] }
		]);
		expect(queuedKinds(store)).toEqual(["edit"]);
	});

	test("deleting a Session also drops the handover that pointed at it", async () => {
		const store = await hydratedStore(
			seedOf([
				session({ id: "first", endTime: "10:00" }),
				session({
					id: "second",
					startTime: "10:20",
					endTime: "11:00",
					precededById: "first",
					handoverType: "TRAVEL",
					interClientDistance: 12
				})
			])
		);

		store.deleteSession("first");

		expect(store.getLogState().sessions).toMatchObject([
			{ id: "second", precededById: null, handoverType: null }
		]);
		expect(queuedKinds(store)).toEqual(["delete"]);
	});
});

describe("a Session left open past its day", () => {
	test("ends at 23:59 on hydration and nudges for review", async () => {
		const store = await hydratedStore(seedOf([session()]));

		const state = store.getLogState();
		expect(state.sessions[0].endTime).toBe("23:59");
		expect(state.autoEnded).toEqual(["session-1"]);
		expect(queuedKinds(store)).toEqual(["end"]);

		store.dismissAutoEnded("session-1");
		expect(store.getLogState().autoEnded).toEqual([]);
	});

	test("is left alone when it started in the day's final minute", async () => {
		const store = await hydratedStore(
			seedOf([session({ startTime: "23:59" })])
		);

		// No end after 23:59 exists, so the console hands the Provider an edit
		// rather than inventing an impossible one.
		expect(store.getLogState().sessions[0].endTime).toBeNull();
		expect(store.getLogState().autoEnded).toEqual([]);
	});

	test("saving an edit answers the nudge", async () => {
		const store = await hydratedStore(seedOf([session()]));
		expect(store.getLogState().autoEnded).toEqual(["session-1"]);

		store.editSession({
			id: "session-1",
			date: "2020-01-01",
			startTime: "09:00",
			endTime: "17:30",
			clientIds: [ALICE]
		});

		expect(store.getLogState().autoEnded).toEqual([]);
		expect(store.getLogState().sessions[0].endTime).toBe("17:30");
	});
});

describe("persistence", () => {
	test("captures survive the tab closing", async () => {
		const store = await freshStore();
		store.startSession({ clientIds: [ALICE], startTime: "09:00" });

		await vi.waitFor(() => expect(persisted.current).not.toBeNull());
		expect(persisted.current?.sessions).toHaveLength(1);
		expect(persisted.current?.queue.map((op) => op.kind)).toEqual(["start"]);
	});

	test("a promoted day is dropped locally without queueing anything", async () => {
		const store = await hydratedStore(
			seedOf([
				session({ endTime: "10:00" }),
				session({ id: "other", date: "2020-01-02", endTime: "10:00" })
			])
		);

		store.dropDay("2020-01-01");

		expect(store.getLogState().sessions.map((s) => s.id)).toEqual(["other"]);
		expect(queuedKinds(store)).toEqual([]);
	});
});
