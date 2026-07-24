import {
	billableLines,
	lineDetailsText,
	type BillableActivity,
	type TransitRateContext
} from "@/lib/billing-lines";
import { cn } from "@/lib/utils";

interface Props {
	activity: BillableActivity;
	rateContext?: TransitRateContext;
	className?: string;
}

/**
 * The quantities-only Provider Travel and Activity Based Transport details for
 * an activity, derived from the single billing path (`billableLines` +
 * `lineDetailsText`) so they always agree with the invoice. Provider Travel
 * (labour time + non-labour km) is kept on its own row, distinct from
 * Activity Based Transport (ABT km + expenses).
 * Deliberately carries no dollar figures — the money lives on the parent row;
 * these exist so the provider can check quantities against their notes.
 */
export function activitySubLines(
	activity: BillableActivity,
	rateContext?: TransitRateContext
): { travel: string[]; transport: string[] } {
	const lines = billableLines(activity, rateContext, { forDisplay: true });

	return {
		travel: lines
			.filter(
				(line) => line.kind === "TRAVEL_TIME" || line.kind === "TRAVEL_KM"
			)
			.map((line) => lineDetailsText(line, activity)),
		transport: lines
			.filter((line) => line.kind === "ABT" || line.kind === "EXPENSE")
			.map((line) => lineDetailsText(line, activity))
	};
}

const ActivitySubLines = ({ activity, rateContext, className }: Props) => {
	const { travel, transport } = activitySubLines(activity, rateContext);

	if (travel.length === 0 && transport.length === 0) return null;

	return (
		<div
			className={cn(
				"text-muted-foreground flex flex-col gap-0.5 text-xs",
				className
			)}
		>
			{travel.length > 0 && (
				<span>
					<span className="font-medium">Provider Travel:</span>{" "}
					{travel.join(" · ")}
				</span>
			)}
			{transport.length > 0 && (
				<span>
					<span className="font-medium">Activity Based Transport:</span>{" "}
					{transport.join(" · ")}
				</span>
			)}
		</div>
	);
};

export default ActivitySubLines;
