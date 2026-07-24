import { MAX_TRANSIT_DURATION_MINUTES } from "./trip-utils";

/**
 * Pre-fill for the inter-client travel duration prompt at the next Start:
 * the gap between the previous Session's end and the new Session's start,
 * clamped to the existing 30-minute Travel Time Cap. A zero (or impossible
 * negative) gap yields zero billable travel time.
 */
export function defaultTravelDuration(gapMinutes: number): number {
	return Math.min(Math.max(gapMinutes, 0), MAX_TRANSIT_DURATION_MINUTES);
}

export interface BillableTravelDuration {
	/** Minutes of inter-client travel that actually bill. */
	duration: number;
	/**
	 * The entered duration doesn't physically fit the gap between the two
	 * Sessions - surface a warning so a mistyped time can be spotted, but never
	 * block: the billed duration is already clamped to the gap.
	 */
	exceedsGap: boolean;
}

/**
 * Billable inter-client travel duration:
 * `min(entered (or the gap-clamped default when null), 30-minute cap, gap)`.
 * The clamp bounds duration only - distance always bills in full.
 */
export function billableTravelDuration(
	enteredMinutes: number | null,
	gapMinutes: number
): BillableTravelDuration {
	const gap = Math.max(gapMinutes, 0);
	const requested = enteredMinutes ?? defaultTravelDuration(gap);

	return {
		duration: Math.min(requested, MAX_TRANSIT_DURATION_MINUTES, gap),
		exceedsGap: enteredMinutes !== null && enteredMinutes > gap
	};
}
