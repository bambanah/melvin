import { Badge } from "@/components/ui/badge";
import {
	activityBreakdownRows,
	type BreakdownRow
} from "@/lib/activity-breakdown";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import {
	groupSizeOf,
	type BillableActivity,
	type TransitRateContext
} from "@/lib/billing-lines";
import { Info } from "lucide-react";

const formatCurrency = (value: number) =>
	value.toLocaleString(undefined, {
		style: "currency",
		currency: "AUD"
	});

const suffixLabel = (suffix?: string) => (suffix ? `/${suffix}` : "");

function ApportionmentNote({
	apportionment,
	suffix
}: {
	apportionment: NonNullable<BreakdownRow["apportionment"]>;
	suffix?: string;
}) {
	return (
		<p className="text-foreground/60 text-xs">
			{formatCurrency(apportionment.baseUnitPrice)}
			{suffixLabel(suffix)} ÷ {apportionment.groupSize} ={" "}
			{formatCurrency(apportionment.apportionedUnitPrice)}
			{suffixLabel(suffix)}
		</p>
	);
}

function BreakdownRowItem({
	row,
	showCapNote
}: {
	row: BreakdownRow;
	showCapNote: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-4 py-3">
			<div className="flex flex-col gap-0.5">
				<p className="font-medium">{row.description}</p>
				{row.supportItemCode && (
					<p className="text-foreground/50 font-mono text-xs">
						{row.supportItemCode}
					</p>
				)}
				<p className="text-foreground/70 text-sm">{row.detailsText}</p>
				{row.apportionment && (
					<ApportionmentNote
						apportionment={row.apportionment}
						suffix={row.unitPriceSuffix}
					/>
				)}
				{showCapNote && (
					<Badge variant="secondary" className="mt-1 w-fit">
						Capped at 30 min
					</Badge>
				)}
			</div>
			<div className="flex shrink-0 flex-col items-end">
				<p className="font-semibold">{formatCurrency(row.total)}</p>
				{row.unitPriceSuffix && (
					<p className="text-foreground/60 text-xs">
						{formatCurrency(row.unitPrice)}
						{suffixLabel(row.unitPriceSuffix)}
					</p>
				)}
			</div>
		</div>
	);
}

interface Props {
	activity: BillableActivity;
	rateContext?: TransitRateContext;
	/** The current activity's Provider Travel labour minutes were capped. */
	travelTimeCapped: boolean;
	/**
	 * The linked invoice is frozen (Sent/Paid), so the live breakdown can
	 * legitimately differ from what was billed - show the ADR 0005 caveat.
	 */
	showLiveRatesCaveat: boolean;
}

function ActivityBreakdown({
	activity,
	rateContext,
	travelTimeCapped,
	showLiveRatesCaveat
}: Props) {
	const rows = activityBreakdownRows(activity, rateContext);
	const total = getTotalCostOfActivities([activity], rateContext, {
		forDisplay: true
	});
	const groupSize = groupSizeOf(activity);

	return (
		<div className="flex flex-col gap-1 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<p className="font-semibold">Billing breakdown</p>
				{groupSize > 1 && (
					<Badge variant="secondary">Group of {groupSize}</Badge>
				)}
			</div>

			<div className="divide-y">
				{rows.map((row, index) => (
					<BreakdownRowItem
						key={`${row.kind}-${index}`}
						row={row}
						showCapNote={row.kind === "TRAVEL_TIME" && travelTimeCapped}
					/>
				))}
			</div>

			<div className="mt-2 flex items-center justify-between border-t pt-3">
				<p className="font-semibold">Total</p>
				<p className="text-lg font-semibold" data-testid="breakdown-total">
					{formatCurrency(total)}
				</p>
			</div>

			{showLiveRatesCaveat && (
				<div className="text-foreground/60 mt-2 flex items-start gap-2 text-xs">
					<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
					<p>
						Reflects current rates - see the invoice for the amount actually
						billed.
					</p>
				</div>
			)}
		</div>
	);
}

export default ActivityBreakdown;
