// React view over the Log store: subscribe + the derived shapes every Log
// surface needs (the Open Session, sessions grouped by day and by Client,
// client names).
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getLogState, subscribeLog } from "@/lib/log/log-store";
import {
	EMPTY_LOG_STATE,
	type LogClient,
	type LogSession
} from "@/lib/log/log-types";

/** A Client's section of the Log - kept even when it holds no Sessions. */
export interface ClientSection {
	client: LogClient;
	sessions: LogSession[];
}

export function useLog() {
	const state = useSyncExternalStore(
		subscribeLog,
		getLogState,
		() => EMPTY_LOG_STATE
	);

	return useMemo(() => {
		const clientNameById = new Map(
			state.clients.map((client) => [client.id, client.name])
		);
		const clientName = (clientId: string) =>
			clientNameById.get(clientId) ?? "A Client";

		const sessionsByDay = new Map<string, LogSession[]>();
		for (const session of state.sessions) {
			sessionsByDay.set(session.date, [
				...(sessionsByDay.get(session.date) ?? []),
				session
			]);
		}

		// The per-Client sections of the Log, mirroring the server's listByClient
		// shape: every Client keeps a section as standing scaffolding, and a group
		// Session appears under each of its participants.
		const sessionsByClient: ClientSection[] = state.clients.map((client) => ({
			client,
			sessions: state.sessions.filter((session) =>
				session.clientIds.includes(client.id)
			)
		}));

		// Participants are stored in id order so both sides agree on which one is
		// primary; names read alphabetically instead.
		const participantNameList = (session: LogSession) =>
			session.clientIds.map(clientName).sort((a, b) => a.localeCompare(b));

		return {
			...state,
			openSession:
				state.sessions.find((session) => session.endTime === null) ?? null,
			sessionsByDay,
			sessionsByClient,
			clientName,
			participantNameList,
			participantNames: (session: LogSession) =>
				participantNameList(session).join(" + ")
		};
	}, [state]);
}

export type Log = ReturnType<typeof useLog>;

/** Re-renders every 30s so live elapsed times tick. */
export function useNowTick() {
	const [, setTick] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => setTick((tick) => tick + 1), 30_000);
		return () => clearInterval(interval);
	}, []);
}
