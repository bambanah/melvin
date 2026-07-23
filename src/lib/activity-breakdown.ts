import type { UnitPriceSuffix } from "@/schema/invoice-version-schema";
import {
	billableLines,
	DEFAULT_ACTIVITY_TRANSPORT_RATE,
	getBaseTransitRate,
	getRateForActivity,
	groupSizeOf,
	lineDetailsText,
	lineUnitPriceSuffix,
	type BillableActivity,
	type BillableLine,
	type LineKind,
	type TransitRateContext
} from "./billing-lines";

export interface BreakdownRow {
	kind: LineKind;
	description: string;
	supportItemCode: string;
	/** Human-readable details column (time span, km, expense label + note). */
	detailsText: string;
	unitPrice: number;
	unitPriceSuffix?: UnitPriceSuffix;
	total: number;
	/**
	 * Present only for group activities on lines whose unit price was divided
	 * across participants (everything except flat expenses). Lets the page show
	 * the `$base ÷ N = $apportioned` split without re-deriving any total.
	 */
	apportionment?: {
		baseUnitPrice: number;
		groupSize: number;
		apportionedUnitPrice: number;
	};
}

/**
 * The per-participant, pre-apportionment unit price for a line's kind. Sourced
 * from the same inputs `billableLines` uses so the split we display can never
 * disagree with the single costing path - this is display metadata, not a
 * second costing path (the totals still come straight from `billableLines`).
 */
function baseUnitPriceFor(
	kind: LineKind,
	activity: BillableActivity,
	rateContext?: TransitRateContext
): number | undefined {
	switch (kind) {
		case "SUPPORT":
		case "TRAVEL_TIME":
			return getRateForActivity(activity)[1];
		case "TRAVEL_KM":
			return getBaseTransitRate(activity, rateContext);
		case "ABT":
			return DEFAULT_ACTIVITY_TRANSPORT_RATE;
		case "EXPENSE":
			return undefined;
	}
}

/**
 * Maps an Activity's canonical `billableLines` into priced display rows for the
 * activity detail page (docs/plans/037). Pure and total-preserving: the sum of
 * `row.total` equals `getTotalCostOfActivities([activity], …)` by construction.
 */
export function activityBreakdownRows(
	activity: BillableActivity,
	rateContext?: TransitRateContext
): BreakdownRow[] {
	const groupSize = groupSizeOf(activity);
	const lines = billableLines(activity, rateContext, { forDisplay: true });

	return lines.map((line: BillableLine): BreakdownRow => {
		const base = baseUnitPriceFor(line.kind, activity, rateContext);
		const apportionment =
			groupSize > 1 && base !== undefined
				? {
						baseUnitPrice: base,
						groupSize,
						apportionedUnitPrice: line.unitPrice
					}
				: undefined;

		return {
			kind: line.kind,
			description: line.description,
			supportItemCode: line.supportItemCode,
			detailsText: lineDetailsText(line, activity),
			unitPrice: line.unitPrice,
			unitPriceSuffix: lineUnitPriceSuffix(line, activity),
			total: line.total,
			apportionment
		};
	});
}
