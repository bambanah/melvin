// PROTOTYPE - throwaway (#502). In-memory Regular Time per Client. Module-level
// so it survives client-side navigation between the Client page and its edit
// form; a full reload wipes it. Nothing is persisted.
import { trpc } from "@/lib/trpc";
import { useSyncExternalStore } from "react";

export type RegularTime = {
	startTime: string;
	endTime: string;
	supportItemId: string;
	claimsTravel: boolean;
};

const store = new Map<string, RegularTime | null>();
const listeners = new Set<() => void>();

export function setRegularTime(clientId: string, value: RegularTime | null) {
	store.set(clientId, value);
	listeners.forEach((l) => l());
}

export function useRegularTime(clientId: string) {
	return useSyncExternalStore(
		(l) => {
			listeners.add(l);
			return () => listeners.delete(l);
		},
		() => store.get(clientId) ?? null,
		() => null
	);
}

/** Solo + hourly Support Items, and the Provider's default solo one. */
export function useSoloHourlyItems() {
	const { data: user } = trpc.user.fetch.useQuery();
	const { data } = trpc.supportItem.list.useQuery({ limit: 100 });
	const items = (data?.supportItems ?? []).filter(
		(i) => !i.isGroup && i.rateType === "HOUR"
	);
	const defaultId =
		items.find((i) => i.id === user?.defaultSupportItemId)?.id ?? items[0]?.id;
	return { items, defaultId };
}

export function blankRegularTime(defaultId: string | undefined): RegularTime {
	return {
		startTime: "",
		endTime: "",
		supportItemId: defaultId ?? "",
		claimsTravel: false
	};
}

export function validate(rt: RegularTime) {
	if (!rt.startTime || !rt.endTime) return "Start and end are required";
	if (rt.endTime <= rt.startTime) return "End must be after start";
	if (!rt.supportItemId) return "Pick a Support Item";
	return null;
}

export function formatTime(hhmm: string) {
	const [h, m] = hhmm.split(":").map(Number);
	const suffix = h >= 12 ? "pm" : "am";
	return `${h % 12 || 12}:${m.toString().padStart(2, "0")}${suffix}`;
}

export function formatSpan(rt: RegularTime) {
	return `${formatTime(rt.startTime)} - ${formatTime(rt.endTime)}`;
}
