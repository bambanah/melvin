import type { LogSession } from "@/lib/log/log-types";

/** One-line summary of a Session's captured extras (group, trips, costs, handover). */
export function SessionMeta({ session }: { session: LogSession }) {
	const trips = session.transportItems.filter(
		(item) => item.type === "DISTANCE"
	);
	const costs = session.transportItems.filter(
		(item) => item.type !== "DISTANCE"
	);
	const parts: string[] = [];
	if (session.clientIds.length > 1) {
		parts.push(`group of ${session.clientIds.length}`);
	}
	if (trips.length > 0) {
		const km = trips.reduce((sum, trip) => sum + trip.amount, 0);
		parts.push(`${km} km driven`);
	}
	if (costs.length > 0) {
		const total = costs.reduce((sum, cost) => sum + cost.amount, 0);
		parts.push(`$${total.toFixed(2)} costs`);
	}
	if (session.handoverType === "TRAVEL") {
		parts.push(`arrived by ${session.interClientDistance} km drive`);
	}
	if (parts.length === 0) return null;
	return <p className="text-muted-foreground text-xs">{parts.join(" · ")}</p>;
}
