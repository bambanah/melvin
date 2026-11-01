// PROTOTYPE - throwaway (#502). Shared state for the "applying a Regular Time"
// variants: which variant is showing, the Activities each apply would have
// created (in memory only - no mutation is called), and which dates already
// hold an Activity for a Client (real Activities plus the in-memory ones).
import { trpc } from "@/lib/trpc";
import { format, startOfDay, subDays } from "date-fns";
import { useRouter } from "next/router";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { formatSpan, type RegularTime } from "./store";

export const APPLY_VARIANTS = [
	{
		key: "A",
		name: "Client page: apply dialog",
		hint: "Open a Client, Regular time section, Apply to dates",
		href: "/dashboard/clients"
	},
	{
		key: "B",
		name: "Calendar: select mode",
		hint: "Calendar header, Regular time button",
		href: "/dashboard"
	},
	{
		key: "C",
		name: "Quick add: Regular time tab",
		hint: "FAB (phone) or calendar day, Add Activity",
		href: "/dashboard"
	},
	{
		key: "D",
		name: "Clients list: week grid",
		hint: "Clients list, Regular time card",
		href: "/dashboard/clients"
	},
	{
		key: "E",
		name: "Quick add: regular time in the row",
		hint: "FAB (phone) or calendar day, Add Activity, pick a Client",
		href: "/dashboard"
	}
];

export type Created = { clientId: string; date: string; regularTime: string };

let lastVariant = "A";
let created: Created[] = [];
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};

// Survives client-side navigation between pages that don't carry ?variant=.
export function useApplyVariant() {
	const router = useRouter();
	const fromQuery =
		typeof router.query.variant === "string" ? router.query.variant : null;
	useEffect(() => {
		if (fromQuery) lastVariant = fromQuery;
	}, [fromQuery]);
	return fromQuery ?? lastVariant;
}

export function useCreated() {
	return useSyncExternalStore(
		subscribe,
		() => created,
		() => created
	);
}

export const dateKey = (d: Date) => format(d, "yyyy-MM-dd");

export function createActivities(
	entries: { clientId: string; date: Date; regularTime: RegularTime }[]
) {
	created = [
		...created,
		...entries.map((e) => ({
			clientId: e.clientId,
			date: dateKey(e.date),
			regularTime: formatSpan(e.regularTime)
		}))
	];
	listeners.forEach((l) => l());
	toast.info(
		`PROTOTYPE: would create ${entries.length} Pending ${entries.length === 1 ? "Activity" : "Activities"} (nothing saved)`
	);
}

/** The window every variant can reach back into. */
export const LOOKBACK_DAYS = 90;

/** clientId -> set of yyyy-MM-dd dates already holding an Activity. */
export function useExistingDates() {
	const today = startOfDay(new Date());
	const startDate = subDays(today, LOOKBACK_DAYS);
	const { data: activities } = trpc.activity.byDateRange.useQuery(
		{ startDate, endDate: subDays(today, -1) },
		{ staleTime: 60_000 }
	);
	const createdNow = useCreated();

	return useMemo(() => {
		const map = new Map<string, Set<string>>();
		const add = (clientId: string, key: string) => {
			if (!map.has(clientId)) map.set(clientId, new Set());
			map.get(clientId)!.add(key);
		};
		for (const a of activities ?? []) {
			if (a.client) add(a.client.id, format(new Date(a.date), "yyyy-MM-dd"));
		}
		for (const c of createdNow) add(c.clientId, c.date);
		return map;
	}, [activities, createdNow]);
}

/** Active Clients that have a Regular Time set. */
export function useClientsWithRegularTime(
	regularTimes: Map<string, RegularTime>
) {
	const { data } = trpc.clients.list.useQuery({ limit: 100 });
	return (data?.clients ?? []).filter((c) => regularTimes.has(c.id));
}
