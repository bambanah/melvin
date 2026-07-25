// React view over the Log store: subscribe + the derived shapes every Log
// surface needs (the Open Session, sessions grouped by day, client names).
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getLogState, subscribeLog } from "./log-store";
import { EMPTY_LOG_STATE, type LogSession } from "./log-types";

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
		const sessionsByDay = new Map<string, LogSession[]>();
		for (const session of state.sessions) {
			sessionsByDay.set(session.date, [
				...(sessionsByDay.get(session.date) ?? []),
				session
			]);
		}

		return {
			...state,
			openSession:
				state.sessions.find((session) => session.endTime === null) ?? null,
			sessionsByDay,
			participantNames: (session: LogSession) =>
				session.clientIds
					.map((id) => clientNameById.get(id) ?? "A Client")
					.join(" + ")
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
