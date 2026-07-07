import { trpc } from "@/lib/trpc";

/**
 * The current user's effective transit rate, for `getTotalCostOfActivities`'s
 * `rateContext`. Undefined while `user.fetch` is loading; `user.fetch` is
 * already cached by react-query elsewhere, so this adds no new network call.
 */
export function useRateContext(): { userTransitRatePerKm: number } | undefined {
	const { data: user } = trpc.user.fetch.useQuery();

	if (!user) return undefined;

	return { userTransitRatePerKm: Number(user.transitRatePerKm ?? 0.99) };
}
