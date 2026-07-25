// The Log's on-device store and sync client (stage 3 of the offline-first
// decision in docs/adr/0006): every capture applies to local state
// immediately, stamped with the tap time, and is queued as a log-router
// mutation. The queue replays FIFO whenever we're online - the router's
// writes are idempotent upserts with last-write-wins on `updatedAt`, so a
// replay after a signal drop can never duplicate or distort a capture. Once
// the queue is dry, a pull of `listByClient` re-converges local state with
// whatever other devices have done.
//
// Local guards deliberately mirror the router's rules (one Open Session,
// end-after-start, pivot-after-start) so a capture that would be rejected at
// sync time is rejected at tap time instead, while there's still a thumb on
// the screen to fix it.
import type { AppRouter } from "@/server/api/app-router";
import type { LogRouterOutput } from "@/server/api/routers/log-router";
import { TRPCClientError, createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { loadPersistedLog, savePersistedLog } from "./log-db";
import {
	dayKeyOf,
	hhmmToMinutes,
	nowStamp,
	timeOf,
	todayKey
} from "./log-time";
import {
	EMPTY_LOG_STATE,
	type HandoverType,
	type LogOp,
	type LogSession,
	type LogState,
	type LogTransportItemType
} from "./log-types";

let state: LogState = EMPTY_LOG_STATE;
const listeners = new Set<() => void>();

export function getLogState(): LogState {
	return state;
}

export function subscribeLog(listener: () => void): () => void {
	listeners.add(listener);
	start();
	return () => listeners.delete(listener);
}

function setState(patch: Partial<LogState>) {
	state = { ...state, ...patch };
	for (const listener of listeners) listener();
}

/** setState + persist - for changes that must survive the tab closing. */
function commit(patch: Partial<LogState>) {
	setState(patch);
	void savePersistedLog({
		sessions: state.sessions,
		clients: state.clients,
		queue: state.queue
	});
}

const newId = () => crypto.randomUUID();

const sortSessions = (sessions: LogSession[]) =>
	[...sessions].sort(
		(a, b) =>
			a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
	);

const openSessionOf = (sessions: LogSession[]) =>
	sessions.find((session) => session.endTime === null) ?? null;

function mustFind(id: string): LogSession {
	const session = state.sessions.find((s) => s.id === id);
	if (!session) throw new Error("That Session no longer exists");
	return session;
}

function enqueue(sessions: LogSession[], op: LogOp) {
	commit({ sessions: sortSessions(sessions), queue: [...state.queue, op] });
	void syncLog();
}

// --- capture actions -------------------------------------------------------

export interface StartResult {
	session: LogSession;
	/**
	 * The Session this Start hands over from - the Open one it auto-closed, or
	 * the latest already-closed Session earlier the same day. Both stamped
	 * times are known now, so this is the moment to prompt for the drive.
	 */
	previous: LogSession | null;
}

export function startSession(input: {
	clientIds: string[];
	startTime: string;
}): StartResult {
	const date = todayKey();
	const clientIds = [...new Set(input.clientIds)];
	if (clientIds.length === 0) throw new Error("Pick at least one Client");

	const open = openSessionOf(state.sessions);
	if (open && open.date !== date) {
		throw new Error(
			"You still have an Open Session from another day - end it with the right time first"
		);
	}
	if (open && hhmmToMinutes(open.startTime) > hhmmToMinutes(input.startTime)) {
		throw new Error(
			"An Open Session can't be closed at this start time - end it with the right time first"
		);
	}

	const stamp = nowStamp();
	const session: LogSession = {
		id: newId(),
		date,
		startTime: input.startTime,
		endTime: null,
		clientIds,
		precededById: null,
		handoverType: null,
		interClientDistance: null,
		interClientDuration: null,
		transportItems: [],
		updatedAt: stamp
	};

	const previous =
		open ??
		sortSessions(
			state.sessions.filter(
				(s) =>
					s.date === date &&
					s.endTime !== null &&
					hhmmToMinutes(s.endTime) <= hhmmToMinutes(input.startTime)
			)
		).at(-1) ??
		null;

	// At most one Open Session: starting the next Client auto-closes the
	// previous at the moment the new one begins - exactly what the router's
	// `start` does when it syncs.
	const sessions = [
		...state.sessions.map((s) =>
			s.id === open?.id
				? { ...s, endTime: input.startTime, updatedAt: stamp }
				: s
		),
		session
	];

	enqueue(sessions, {
		kind: "start",
		input: {
			id: session.id,
			date,
			startTime: input.startTime,
			clientIds,
			updatedAt: stamp
		}
	});

	return { session, previous };
}

const END_OF_DAY = "23:59";

/**
 * Sessions can't cross midnight and overnights aren't supported: a Session
 * still Open after its day ended closes automatically at end-of-day, so the
 * day becomes promotable and the next morning starts clean. The end time is
 * editable afterwards like any other capture. Runs wherever the store wakes
 * up (hydration, reconnect, the heartbeat, a pull that delivers a stale Open
 * Session from another device) - with or without signal.
 */
function closeOverdueSessions() {
	const open = openSessionOf(state.sessions);
	if (!open || open.date >= todayKey()) return;
	// A Session started in the day's final minute can't fit an end after its
	// start - the console offers an edit escape hatch for that one.
	if (open.startTime >= END_OF_DAY) return;
	endSession(open.id, END_OF_DAY);
}

export function endSession(id: string, endTime: string) {
	const session = mustFind(id);
	if (hhmmToMinutes(endTime) <= hhmmToMinutes(session.startTime)) {
		throw new Error(
			"End time must be after start time - Sessions can't cross midnight"
		);
	}

	const stamp = nowStamp();
	enqueue(
		state.sessions.map((s) =>
			s.id === id ? { ...s, endTime, updatedAt: stamp } : s
		),
		{ kind: "end", input: { id, endTime, updatedAt: stamp } }
	);
}

export function editSession(input: {
	id: string | null;
	date: string;
	startTime: string;
	endTime: string | null;
	clientIds: string[];
	transportItems?: LogSession["transportItems"];
}) {
	const clientIds = [...new Set(input.clientIds)];
	if (clientIds.length === 0) throw new Error("Pick at least one Client");
	if (
		input.endTime !== null &&
		hhmmToMinutes(input.endTime) <= hhmmToMinutes(input.startTime)
	) {
		throw new Error(
			"End time must be after start time - Sessions can't cross midnight"
		);
	}

	const stamp = nowStamp();
	const existing = input.id
		? state.sessions.find((s) => s.id === input.id)
		: undefined;
	const session: LogSession = {
		id: existing?.id ?? newId(),
		date: input.date,
		startTime: input.startTime,
		endTime: input.endTime,
		clientIds,
		precededById: existing?.precededById ?? null,
		handoverType: existing?.handoverType ?? null,
		interClientDistance: existing?.interClientDistance ?? null,
		interClientDuration: existing?.interClientDuration ?? null,
		transportItems: input.transportItems ?? existing?.transportItems ?? [],
		updatedAt: stamp
	};

	enqueue([...state.sessions.filter((s) => s.id !== session.id), session], {
		kind: "edit",
		input: {
			id: session.id,
			date: input.date,
			startTime: input.startTime,
			endTime: input.endTime,
			clientIds,
			transportItems: input.transportItems?.map((item) => ({
				id: item.id,
				type: item.type,
				amount: item.amount,
				note: item.note ?? undefined
			})),
			updatedAt: stamp
		}
	});
}

export function deleteSession(id: string) {
	enqueue(
		state.sessions
			.filter((s) => s.id !== id)
			.map((s) =>
				s.precededById === id
					? { ...s, precededById: null, handoverType: null }
					: s
			),
		{ kind: "delete", input: { id } }
	);
}

export function recordTrip(input: {
	workSessionId: string;
	distance: number;
	note?: string;
}) {
	if (!(input.distance > 0)) throw new Error("Distance must be positive");
	pushTransportItem(input.workSessionId, {
		kind: "recordTrip",
		input: { ...input, id: newId() }
	});
}

export function recordCost(input: {
	workSessionId: string;
	type: Exclude<LogTransportItemType, "DISTANCE">;
	amount: number;
	note?: string;
}) {
	if (!(input.amount >= 0)) throw new Error("Cost can't be negative");
	pushTransportItem(input.workSessionId, {
		kind: "recordCost",
		input: { ...input, id: newId() }
	});
}

function pushTransportItem(
	workSessionId: string,
	op: Extract<LogOp, { kind: "recordTrip" | "recordCost" }>
) {
	const session = mustFind(workSessionId);
	const item = {
		id: op.input.id,
		type: op.kind === "recordTrip" ? ("DISTANCE" as const) : op.input.type,
		amount: op.kind === "recordTrip" ? op.input.distance : op.input.amount,
		note: op.input.note ?? null
	};
	enqueue(
		state.sessions.map((s) =>
			s.id === session.id
				? { ...s, transportItems: [...s.transportItems, item] }
				: s
		),
		op
	);
}

// A composition change is an In-Place Handover: close the current Session at
// the pivot instant and open a new one at the same instant with the changed
// Client list - the same split the router's splitAtPivot performs on replay.
export function changeParticipants(input: {
	workSessionId: string;
	clientId: string;
	at: string;
	change: "add" | "remove";
}): LogSession {
	const session = mustFind(input.workSessionId);
	if (session.endTime !== null) {
		throw new Error(
			"Participants can only change on an Open Session - edit the captured Sessions instead"
		);
	}
	if (hhmmToMinutes(input.at) <= hhmmToMinutes(session.startTime)) {
		throw new Error("The change must happen after the Session started");
	}

	let clientIds: string[];
	if (input.change === "add") {
		if (session.clientIds.includes(input.clientId)) {
			throw new Error("That Client is already in this Session");
		}
		clientIds = [...session.clientIds, input.clientId];
	} else {
		clientIds = session.clientIds.filter((id) => id !== input.clientId);
		if (clientIds.length === session.clientIds.length) {
			throw new Error("That Client is not in this Session");
		}
		if (clientIds.length === 0) {
			throw new Error(
				"A Session needs at least one Client - delete it instead"
			);
		}
	}

	const stamp = nowStamp();
	const opened: LogSession = {
		id: newId(),
		date: session.date,
		startTime: input.at,
		endTime: null,
		clientIds,
		precededById: session.id,
		handoverType: "IN_PLACE",
		interClientDistance: null,
		interClientDuration: null,
		transportItems: [],
		updatedAt: stamp
	};

	enqueue(
		[
			...state.sessions.map((s) =>
				s.id === session.id ? { ...s, endTime: input.at, updatedAt: stamp } : s
			),
			opened
		],
		{
			kind: input.change === "add" ? "addParticipant" : "removeParticipant",
			input: {
				workSessionId: session.id,
				clientId: input.clientId,
				at: input.at,
				newWorkSessionId: opened.id,
				updatedAt: stamp
			}
		}
	);

	return opened;
}

export function captureHandover(input: {
	workSessionId: string;
	precededByWorkSessionId: string;
	handoverType: HandoverType;
	interClientDistance?: number;
	interClientDuration?: number;
}) {
	mustFind(input.workSessionId);
	const isTravel = input.handoverType === "TRAVEL";
	if (
		isTravel &&
		!(input.interClientDistance && input.interClientDistance > 0)
	) {
		throw new Error("Distance is required for a travel Handover");
	}

	const stamp = nowStamp();
	enqueue(
		state.sessions.map((s) =>
			s.id === input.workSessionId
				? {
						...s,
						precededById: input.precededByWorkSessionId,
						handoverType: input.handoverType,
						interClientDistance: isTravel
							? (input.interClientDistance ?? null)
							: null,
						interClientDuration: isTravel
							? (input.interClientDuration ?? null)
							: null,
						updatedAt: stamp
					}
				: s
		),
		{ kind: "captureHandover", input: { ...input, updatedAt: stamp } }
	);
}

/**
 * Promotion consumed a day server-side (via the online-only promoteDay
 * mutation) - drop its Sessions locally without queueing anything.
 */
export function dropDay(dateKey: string) {
	commit({
		sessions: state.sessions.filter((s) => s.date !== dateKey)
	});
	void syncLog();
}

// --- sync ------------------------------------------------------------------

type Api = ReturnType<typeof createApi>;
const createApi = () =>
	createTRPCClient<AppRouter>({
		links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })]
	});
let apiInstance: Api | null = null;
const api = () => (apiInstance ??= createApi());

function send(op: LogOp) {
	const log = api().log;
	switch (op.kind) {
		case "start": {
			const { date, updatedAt, ...rest } = op.input;
			return log.start.mutate({
				...rest,
				date: new Date(date),
				updatedAt: new Date(updatedAt)
			});
		}
		case "end": {
			const { updatedAt, ...rest } = op.input;
			return log.end.mutate({ ...rest, updatedAt: new Date(updatedAt) });
		}
		case "edit": {
			const { date, updatedAt, ...rest } = op.input;
			return log.edit.mutate({
				...rest,
				date: new Date(date),
				updatedAt: new Date(updatedAt)
			});
		}
		case "delete":
			return log.delete.mutate(op.input);
		case "addParticipant": {
			const { updatedAt, ...rest } = op.input;
			return log.addParticipant.mutate({
				...rest,
				updatedAt: new Date(updatedAt)
			});
		}
		case "removeParticipant": {
			const { updatedAt, ...rest } = op.input;
			return log.removeParticipant.mutate({
				...rest,
				updatedAt: new Date(updatedAt)
			});
		}
		case "recordTrip":
			return log.recordTrip.mutate(op.input);
		case "recordCost":
			return log.recordCost.mutate(op.input);
		case "captureHandover": {
			const { updatedAt, ...rest } = op.input;
			return log.captureHandover.mutate({
				...rest,
				updatedAt: new Date(updatedAt)
			});
		}
	}
}

/**
 * A response the server actively rejected (validation, conflict, not-found).
 * Anything else - fetch failure, timeout, aborted navigation - is transient
 * network trouble: keep the op queued and retry on the next trigger.
 */
const isServerRejection = (
	error: unknown
): error is TRPCClientError<AppRouter> =>
	error instanceof TRPCClientError && error.data != null;

let syncPromise: Promise<void> | null = null;

/** Drain the queue, then pull. Coalesces concurrent triggers into one run. */
export function syncLog(): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	syncPromise ??= drainAndPull().finally(() => {
		syncPromise = null;
	});
	return syncPromise;
}

async function drainAndPull() {
	if (!navigator.onLine) {
		setState({ online: false });
		return;
	}
	setState({ online: true, syncing: true });
	try {
		// Loop until local and server state converge: taps can land while a
		// pull is in flight, and the pull itself can enqueue work (auto-closing
		// a stale Open Session another device left behind) - both drain in the
		// next round rather than waiting for the heartbeat. Each round only
		// recurs when the queue grew, so this can't spin.
		for (;;) {
			while (state.queue.length > 0) {
				const op = state.queue[0];
				try {
					await send(op);
				} catch (error) {
					if (!isServerRejection(error)) return; // offline again - retry later
					// The server refused this capture; dropping it and re-pulling
					// converges local state, and the message tells the Provider why.
					commit({ queue: state.queue.slice(1), lastSyncError: error.message });
					continue;
				}
				commit({ queue: state.queue.slice(1) });
			}

			const rows = await api().log.listByClient.query();
			// New taps landed while the pull was in flight - drain them before
			// reconciling rather than clobbering them with a pre-tap snapshot.
			if (state.queue.length > 0) continue;
			commit(fromServer(rows));
			closeOverdueSessions();
			if (state.queue.length === 0) return;
		}
	} catch {
		// Transient network failure mid-sync; the queue is intact.
	} finally {
		setState({ syncing: false });
	}
}

export function clearSyncError() {
	setState({ lastSyncError: null });
}

function fromServer(rows: LogRouterOutput["listByClient"]): {
	sessions: LogSession[];
	clients: LogState["clients"];
} {
	// A group Session appears under each participant's section - dedupe by id.
	const byId = new Map<string, LogSession>();
	for (const row of rows) {
		for (const session of row.sessions) {
			byId.set(session.id, {
				id: session.id,
				date: dayKeyOf(session.date),
				startTime: timeOf(session.startTime),
				endTime: session.endTime ? timeOf(session.endTime) : null,
				clientIds: session.participants.map((p) => p.clientId),
				precededById: session.precededByWorkSessionId,
				handoverType: session.handoverType,
				interClientDistance:
					session.interClientDistance === null
						? null
						: Number(session.interClientDistance),
				interClientDuration:
					session.interClientDuration === null
						? null
						: Number(session.interClientDuration),
				transportItems: session.transportItems.map((item) => ({
					id: item.id,
					type: item.type,
					amount: Number(item.amount),
					note: item.note
				})),
				updatedAt: session.updatedAt.toISOString()
			});
		}
	}
	return {
		sessions: sortSessions([...byId.values()]),
		clients: rows.map((row) => row.client)
	};
}

// --- lifecycle -------------------------------------------------------------

let started = false;

function start() {
	if (started || typeof window === "undefined") return;
	started = true;

	setState({ online: navigator.onLine });

	void loadPersistedLog().then((persisted) => {
		// Captures made in the instant before hydration completed win over the
		// persisted snapshot; the pull below re-converges everything anyway.
		if (persisted && state.queue.length === 0 && state.sessions.length === 0) {
			setState({ ...persisted, hydrated: true });
		} else {
			setState({ hydrated: true });
		}
		closeOverdueSessions();
		void syncLog();
	});

	window.addEventListener("online", () => {
		setState({ online: true });
		closeOverdueSessions();
		void syncLog();
	});
	window.addEventListener("offline", () => setState({ online: false }));
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") {
			closeOverdueSessions();
			void syncLog();
		}
	});
	// Captures sync on the spot; this heartbeat catches missed edges (a
	// flapping connection, another device promoting the day) and the midnight
	// rollover of a Session left running on-screen.
	setInterval(() => {
		closeOverdueSessions();
		void syncLog();
	}, 60_000);
}
