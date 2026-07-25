// The Log's on-device model. Everything here is JSON-serializable (dates as
// "yyyy-MM-dd", times as "HH:mm", stamps as ISO strings) so the whole state
// round-trips through IndexedDB and the queued mutations replay verbatim
// against the log-router after an offline period.

export type LogTransportItemType = "DISTANCE" | "PARKING" | "TOLL" | "OTHER";

export interface LogTransportItem {
	id: string;
	type: LogTransportItemType;
	amount: number;
	note: string | null;
}

export type HandoverType = "TRAVEL" | "IN_PLACE";

export interface LogSession {
	id: string;
	/** UTC day, "yyyy-MM-dd" - matches how WorkSession.date is stored. */
	date: string;
	/** "HH:mm" wall-clock times; an Open Session has no endTime. */
	startTime: string;
	endTime: string | null;
	clientIds: string[];
	precededById: string | null;
	handoverType: HandoverType | null;
	interClientDistance: number | null;
	interClientDuration: number | null;
	transportItems: LogTransportItem[];
	/** ISO stamp of the tap that last changed this Session (last-write-wins). */
	updatedAt: string;
}

export interface LogClient {
	id: string;
	name: string;
}

// One queued log-router mutation. Inputs mirror the router contract; ids are
// minted on-device so replays are idempotent upserts, and `updatedAt` carries
// the tap time so a delayed upload never distorts the recorded day.
export type LogOp =
	| {
			kind: "start";
			input: {
				id: string;
				date: string;
				startTime: string;
				clientIds: string[];
				updatedAt: string;
			};
	  }
	| {
			kind: "end";
			input: { id: string; endTime: string; updatedAt: string };
	  }
	| {
			kind: "edit";
			input: {
				id: string;
				date: string;
				startTime: string;
				endTime: string | null;
				clientIds: string[];
				/** Full-replace of the captured trips/costs; omit to leave them alone. */
				transportItems?: {
					id?: string;
					type: LogTransportItemType;
					amount: number;
					note?: string;
				}[];
				updatedAt: string;
			};
	  }
	| { kind: "delete"; input: { id: string } }
	| {
			kind: "addParticipant" | "removeParticipant";
			input: {
				workSessionId: string;
				clientId: string;
				at: string;
				newWorkSessionId: string;
				updatedAt: string;
			};
	  }
	| {
			kind: "recordTrip";
			input: {
				id: string;
				workSessionId: string;
				distance: number;
				note?: string;
			};
	  }
	| {
			kind: "recordCost";
			input: {
				id: string;
				workSessionId: string;
				type: Exclude<LogTransportItemType, "DISTANCE">;
				amount: number;
				note?: string;
			};
	  }
	| {
			kind: "captureHandover";
			input: {
				workSessionId: string;
				precededByWorkSessionId: string;
				handoverType: HandoverType;
				interClientDistance?: number;
				interClientDuration?: number;
				updatedAt: string;
			};
	  };

export interface LogState {
	/** False until the persisted state has been loaded from IndexedDB. */
	hydrated: boolean;
	/** Sorted by date then startTime - the single source the UI renders from. */
	sessions: LogSession[];
	clients: LogClient[];
	/** Captures waiting to replay against the server, in tap order. */
	queue: LogOp[];
	online: boolean;
	syncing: boolean;
	/**
	 * Message of the most recent server *rejection* (not a network failure) -
	 * the offending op has been dropped and the next pull re-converges, but the
	 * Provider should see why a capture didn't stick.
	 */
	lastSyncError: string | null;
}

export const EMPTY_LOG_STATE: LogState = {
	hydrated: false,
	sessions: [],
	clients: [],
	queue: [],
	online: true,
	syncing: false,
	lastSyncError: null
};
