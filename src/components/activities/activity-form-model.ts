import { stripTimezone, utcDate } from "@/lib/date-utils";
import { type TransitClient, standaloneTransitFields } from "@/lib/trip-utils";
import type {
	ActivitySchema,
	ActivityTransportItemSchema,
	ActivityTransportType
} from "@/schema/activity-schema";
import { format } from "date-fns";

/**
 * Hydration and submit transforms for the single-activity form.
 *
 * The form is the sole editor for an Activity, and `activity.modify` treats the
 * submitted payload as authoritative — it recreates the transport items and
 * writes the transit fields verbatim. So every field the form can save must be
 * loaded back out of the existing Activity, or saving silently drops it. These
 * transforms are the round-trip contract, kept out of the component so they can
 * be tested directly.
 */

/**
 * The slice of an existing Activity the form hydrates from. Structural so the
 * router's `byId` payload (Decimals serialise to strings over the wire) and
 * hand-built fixtures both satisfy it.
 */
export interface ExistingActivityValues {
	date?: Date;
	client?: { id: string } | null;
	supportItem?: { id: string } | null;
	startTime?: Date | null;
	endTime?: Date | null;
	itemDistance?: number | null;
	transitDistance?: { toString(): string } | null;
	transitDuration?: { toString(): string } | null;
	groupSize?: number | null;
	transportItems?: readonly {
		type: ActivityTransportType;
		amount: { toString(): string };
		note?: string | null;
	}[];
}

/**
 * The Activity Based Transport km field binds to this path, so the distance item
 * must stay at index 0 of the form's `transportItems`. `hydrateTransportItems`
 * and `mergeTransportItems` are the only writers of that array and both uphold
 * it.
 */
export const ABT_DISTANCE_FIELD = "transportItems.0.amount" as const;

const numberOrEmpty = (value?: { toString(): string } | null) =>
	value === null || value === undefined ? "" : String(value);

const emptyDistanceItem = (): ActivityTransportItemSchema => ({
	type: "DISTANCE",
	amount: 0
});

/**
 * Collapses an Activity's stored transport items into the form's shape: one
 * DISTANCE row at index 0 carrying the total km driven during the activity,
 * followed by the parking / toll / other rows. Several stored DISTANCE rows
 * (a Log Session can capture more than one trip) sum into the single km field
 * the form exposes, which preserves the billed distance.
 */
export function hydrateTransportItems(
	items?: ExistingActivityValues["transportItems"]
): ActivityTransportItemSchema[] {
	const stored = items ?? [];

	const distanceKm = stored
		.filter((item) => item.type === "DISTANCE")
		.reduce((total, item) => total + Number(item.amount), 0);

	return [
		{ type: "DISTANCE", amount: distanceKm },
		...stored
			.filter((item) => item.type !== "DISTANCE")
			.map((item) => ({
				type: item.type,
				amount: Number(item.amount),
				note: item.note ?? undefined
			}))
	];
}

/** The parking / toll / other rows, for the transport items editor. */
export const otherTransportItems = (
	items?: ActivityTransportItemSchema[]
): ActivityTransportItemSchema[] =>
	(items ?? []).filter((item) => item.type !== "DISTANCE");

/** Puts edited parking / toll / other rows back, keeping the km row at index 0. */
export const mergeTransportItems = (
	items: ActivityTransportItemSchema[] | undefined,
	others: ActivityTransportItemSchema[]
): ActivityTransportItemSchema[] => [
	(items ?? []).find((item) => item.type === "DISTANCE") ?? emptyDistanceItem(),
	...others
];

/** Form values for a new Activity, or for editing an existing one. */
export function activityFormDefaults(
	existing?: ExistingActivityValues
): ActivitySchema {
	return {
		date: existing?.date ?? stripTimezone(new Date()),
		clientId: existing?.client?.id ?? "",
		supportItemId: existing?.supportItem?.id ?? "",
		startTime: existing?.startTime
			? format(utcDate(existing.startTime), "HH:mm")
			: "",
		endTime: existing?.endTime
			? format(utcDate(existing.endTime), "HH:mm")
			: "",
		itemDistance: existing?.itemDistance ?? undefined,
		transitDistance: numberOrEmpty(existing?.transitDistance),
		transitDuration: numberOrEmpty(existing?.transitDuration),
		groupSize: existing?.groupSize ?? undefined,
		transportItems: hydrateTransportItems(existing?.transportItems)
	};
}

/**
 * The Provider Travel to prefill for an Activity created on its own: the return
 * trip home → Client → home, which is what `standaloneTransit` writes for an
 * Activity that ends up alone on its day. The two must agree, or the same
 * Activity carries different travel depending on which form created it.
 *
 * A Client missing a stored distance or travel time leaves that field blank
 * rather than filling in a 0 the Provider would have to notice and clear.
 */
export function standaloneTravelDefaults(
	client: TransitClient | null
): Pick<ActivitySchema, "transitDistance" | "transitDuration"> {
	const travel = standaloneTransitFields(client);

	return {
		transitDistance:
			travel.transitDistance == null ? "" : String(travel.transitDistance),
		transitDuration:
			travel.transitDuration == null ? "" : String(travel.transitDuration)
	};
}

/**
 * The payload to save. A per-km Support Item is billed by its own distance and
 * an hourly one by its time span, so only the fields the rate type bills on are
 * sent. Zero-amount transport rows are dropped — they bill nothing, and an
 * empty list is how the form clears an Activity's transport.
 */
export function toActivityPayload(
	data: ActivitySchema,
	rateType?: string
): ActivitySchema {
	const isPerKm = rateType === "KM";

	return {
		...data,
		startTime: isPerKm ? undefined : data.startTime,
		endTime: isPerKm ? undefined : data.endTime,
		itemDistance: isPerKm ? data.itemDistance : undefined,
		transportItems: (data.transportItems ?? []).filter(
			(item) => item.amount > 0
		)
	};
}
