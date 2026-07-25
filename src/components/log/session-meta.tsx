import {
	costsOf,
	isGroupSession,
	sumAmounts,
	tripsOf,
	type LogSession
} from "@/lib/log/log-types";

/** One-line summary of a Session's captured extras (group, trips, costs, handover). */
export function SessionMeta({ session }: { session: LogSession }) {
	const trips = tripsOf(session);
	const costs = costsOf(session);
	const parts: string[] = [];
	if (isGroupSession(session)) {
		parts.push(`group of ${session.clientIds.length}`);
	}
	if (trips.length > 0) {
		parts.push(`${sumAmounts(trips)} km driven`);
	}
	if (costs.length > 0) {
		parts.push(`$${sumAmounts(costs).toFixed(2)} costs`);
	}
	if (session.handoverType === "TRAVEL") {
		parts.push(`arrived by ${session.interClientDistance} km drive`);
	}
	if (parts.length === 0) return null;
	return <p className="text-muted-foreground text-xs">{parts.join(" · ")}</p>;
}
