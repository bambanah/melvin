import {
	billableLines,
	getRateForActivity,
	getTransitRate,
	type BillableActivity,
	type BillableLinesOptions,
	type TransitRateContext
} from "./billing-lines";
import { round } from "./generic-utils";

// Re-exported for backward compatibility — billing-lines.ts is now the
// single implementation of activity rate/line math (docs/plans/007).
export { getRateForActivity, getTransitRate };

export const getTotalCostOfActivities = (
	activities: BillableActivity[],
	rateContext?: TransitRateContext,
	options?: BillableLinesOptions
) => {
	const grandTotal = activities
		.flatMap((activity) => billableLines(activity, rateContext, options))
		.reduce((total, line) => total + line.total, 0);

	return round(grandTotal, 2);
};
