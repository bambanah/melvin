// PROTOTYPE - throwaway code for the stage-2 HITL gate of issue #464.
// Shared data layer: real tRPC calls against the stage-1 log-router so the
// state model can be felt with real timestamps. Delete with the prototype.
import { utcDate } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import type { LogRouterOutput } from "@/server/api/routers/log-router";
import { format } from "date-fns";
import { useEffect, useState } from "react";

export type LogSection = LogRouterOutput["listByClient"][number];
export type LogSession = LogSection["sessions"][number];

/** Today as a UTC-midnight Date, matching how WorkSession.date is stored. */
export const todayUtc = () => new Date(format(new Date(), "yyyy-MM-dd"));

export const nowHHmm = () => format(new Date(), "HH:mm");

/** HH:mm of a time-of-day column value (a Date on the UTC epoch day). */
export const sessionTime = (time: Date) => format(utcDate(time), "HH:mm");

export const minutesOfDay = (time: Date) => {
	const utc = utcDate(time);
	return utc.getHours() * 60 + utc.getMinutes();
};

export const hhmmToMinutes = (hhmm: string) => {
	const [hours, minutes] = hhmm.split(":").map(Number);
	return hours * 60 + minutes;
};

export const participantNames = (session: LogSession) =>
	session.participants.map((p) => p.client.name).join(" + ");

export const dayKey = (date: Date) => format(utcDate(date), "yyyy-MM-dd");

/** Re-renders every 30s so live elapsed times tick. */
export function useNowTick() {
	const [, setTick] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => setTick((t) => t + 1), 30_000);
		return () => clearInterval(interval);
	}, []);
}

export const elapsedMinutes = (startTime: Date) =>
	Math.max(hhmmToMinutes(nowHHmm()) - minutesOfDay(startTime), 0);

export const formatElapsed = (minutes: number) =>
	minutes >= 60
		? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
		: `${minutes}m`;

export function useLogPrototype() {
	const utils = trpc.useUtils();
	const sectionsQuery = trpc.log.listByClient.useQuery();

	const onSettled = () => utils.log.invalidate();
	const mutations = {
		start: trpc.log.start.useMutation({ onSettled }),
		end: trpc.log.end.useMutation({ onSettled }),
		edit: trpc.log.edit.useMutation({ onSettled }),
		delete: trpc.log.delete.useMutation({ onSettled }),
		addParticipant: trpc.log.addParticipant.useMutation({ onSettled }),
		removeParticipant: trpc.log.removeParticipant.useMutation({ onSettled }),
		recordTrip: trpc.log.recordTrip.useMutation({ onSettled }),
		recordCost: trpc.log.recordCost.useMutation({ onSettled }),
		captureHandover: trpc.log.captureHandover.useMutation({ onSettled }),
		promoteDay: trpc.log.promoteDay.useMutation({ onSettled })
	};

	const sections = sectionsQuery.data ?? [];

	// A group Session appears under each participant's section - dedupe by id
	// for day-level views.
	const allSessions = [
		...new Map(
			sections.flatMap((s) => s.sessions).map((s) => [s.id, s])
		).values()
	].sort(
		(a, b) =>
			a.date.getTime() - b.date.getTime() ||
			a.startTime.getTime() - b.startTime.getTime()
	);

	const openSession = allSessions.find((s) => s.endTime === null) ?? null;

	const sessionsByDay = new Map<string, LogSession[]>();
	for (const session of allSessions) {
		const key = dayKey(session.date);
		sessionsByDay.set(key, [...(sessionsByDay.get(key) ?? []), session]);
	}

	const clients = sections.map((s) => s.client);

	return {
		isLoading: sectionsQuery.isLoading,
		sections,
		allSessions,
		openSession,
		sessionsByDay,
		clients,
		mutations
	};
}

export type LogPrototype = ReturnType<typeof useLogPrototype>;
