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
		<p className="text-foreground/50 text-xs tabular-nums">
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
		<div className="flex items-start justify-between gap-6 py-4">
			<div className="flex min-w-0 flex-col gap-0.5">
				<p className="text-sm font-medium">{row.description}</p>
				<p className="text-foreground/60 text-xs">
					{row.detailsText}
					{row.supportItemCode && (
						<span className="text-foreground/40 font-mono text-xs">
							{" "}
							· {row.supportItemCode}
						</span>
					)}
				</p>
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
			<div className="flex shrink-0 flex-col items-end gap-0.5">
				<p className="text-sm font-semibold tabular-nums">
					{formatCurrency(row.total)}
				</p>
				{row.unitPriceSuffix && (
					<p className="text-foreground/50 text-xs tabular-nums">
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
		<section className="bg-card overflow-hidden rounded-xl border">
			<div className="flex items-center justify-between gap-2 border-b px-5 py-3.5">
				<h2 className="text-sm font-semibold">Billing breakdown</h2>
				{groupSize > 1 && (
					<Badge variant="secondary">Group of {groupSize}</Badge>
				)}
			</div>

			<div className="divide-y px-5">
				{rows.map((row, index) => (
					<BreakdownRowItem
						key={`${row.kind}-${index}`}
						row={row}
						showCapNote={row.kind === "TRAVEL_TIME" && travelTimeCapped}
					/>
				))}
			</div>

			<div className="bg-muted/40 flex flex-col gap-2 border-t px-5 py-4">
				<div className="flex items-baseline justify-between gap-4">
					<p className="text-foreground/70 text-sm font-medium">Total</p>
					<p
						className="text-lg font-semibold tracking-tight tabular-nums"
						data-testid="breakdown-total"
					>
						{formatCurrency(total)}
					</p>
				</div>

				{showLiveRatesCaveat && (
					<div className="text-foreground/50 flex items-start gap-1.5 text-xs">
						<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<p>
							Reflects current rates - see the invoice for the amount actually
							billed.
						</p>
					</div>
				)}
			</div>
		</section>
	);
}

export default ActivityBreakdown;
