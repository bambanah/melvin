// PROTOTYPE - throwaway (#502). Variant E: no separate tab. In the normal Add
// Activities row, choosing a Client with a Regular Time replaces the Time and
// Transport fields with a read-back of it; "Use specific details" brings the
// fields back, prefilled from the Regular Time, to override.
import { Button } from "@/components/ui/button";
import { isAfter, startOfDay } from "date-fns";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { dateKey, useExistingDates } from "./apply-store";
import { formatSpan, type RegularTime, useSoloHourlyItems } from "./store";

export function RegularTimeSummary({
	clientId,
	regularTime,
	date,
	onOverride
}: {
	clientId: string;
	regularTime: RegularTime;
	date: Date;
	onOverride: () => void;
}) {
	const { items } = useSoloHourlyItems();
	const hasExisting = useExistingDates().get(clientId)?.has(dateKey(date));
	const future = isAfter(startOfDay(date), startOfDay(new Date()));

	return (
		<div className="bg-primary/5 border-primary/30 flex flex-col gap-2 rounded-md border p-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-start gap-2">
					<CalendarClock className="text-primary mt-0.5 size-4 shrink-0" />
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-medium">
							Regular time, {formatSpan(regularTime)}
						</span>
						<span className="text-muted-foreground text-xs">
							{items.find((i) => i.id === regularTime.supportItemId)
								?.description ?? "-"}
							{" · "}
							{regularTime.claimsTravel
								? "Provider Travel claimed"
								: "no Provider Travel"}
						</span>
					</div>
				</div>
				<Button
					type="button"
					variant="link"
					size="sm"
					className="h-auto shrink-0 p-0"
					onClick={onOverride}
				>
					Use specific details
				</Button>
			</div>
			{hasExisting && (
				<p className="text-destructive flex items-center gap-1.5 text-xs">
					<TriangleAlert className="size-3.5" />
					Already has an Activity on this date - another will be added
				</p>
			)}
			{future && (
				<p className="text-destructive flex items-center gap-1.5 text-xs">
					<TriangleAlert className="size-3.5" />
					Future date - regular time applies to past dates and today only
				</p>
			)}
		</div>
	);
}
