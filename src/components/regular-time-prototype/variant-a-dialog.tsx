// PROTOTYPE - throwaway (#502). Variant A: start from the Client page. The
// Regular time section gets an "Apply to dates" button opening a month picker;
// the Client is implicit, days already holding an Activity for them carry a dot.
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle
} from "@/components/ui/responsive-dialog";
import { format, parseISO, startOfDay } from "date-fns";
import { CalendarPlus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { createActivities, dateKey, useExistingDates } from "./apply-store";
import { formatSpan, type RegularTime } from "./store";

export function ApplyDialogButton({
	clientId,
	clientName,
	regularTime
}: {
	clientId: string;
	clientName: string;
	regularTime: RegularTime;
}) {
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<Date[]>([]);
	const existing = useExistingDates().get(clientId) ?? new Set<string>();
	const today = startOfDay(new Date());

	const sorted = [...selected].sort((a, b) => a.getTime() - b.getTime());
	const clashes = sorted.filter((d) => existing.has(dateKey(d)));

	return (
		<>
			<Button size="sm" onClick={() => setOpen(true)}>
				<CalendarPlus className="mr-2 h-4 w-4" />
				Apply to dates
			</Button>

			<ResponsiveDialog
				open={open}
				onOpenChange={(o) => {
					setOpen(o);
					if (!o) setSelected([]);
				}}
			>
				<ResponsiveDialogContent>
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Apply regular time</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							{clientName}, {formatSpan(regularTime)}
							{regularTime.claimsTravel ? ", with travel" : ", no travel"}
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="flex flex-col items-center gap-3 px-4 sm:px-0">
						<Calendar
							mode="multiple"
							selected={selected}
							onSelect={(d) => setSelected(d ?? [])}
							disabled={{ after: today }}
							defaultMonth={today}
							weekStartsOn={1}
							modifiers={{
								existing: [...existing].map((k) => parseISO(k))
							}}
							modifiersClassNames={{
								existing:
									"relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-destructive"
							}}
						/>
						<p className="text-foreground/50 flex items-center gap-1.5 self-start text-xs">
							<span className="bg-destructive size-1.5 rounded-full" />
							Already has an Activity for {clientName}
						</p>

						{clashes.length > 0 && (
							<p className="text-destructive flex items-start gap-1.5 self-start text-sm">
								<TriangleAlert className="mt-0.5 size-4 shrink-0" />
								{clashes
									.map((d) => format(d, "EEE d MMM"))
									.join(", ")} already {clashes.length === 1 ? "has" : "have"}{" "}
								an Activity - another will be added.
							</p>
						)}
					</div>

					<ResponsiveDialogFooter>
						<Button
							disabled={selected.length === 0}
							onClick={() => {
								createActivities(
									sorted.map((date) => ({ clientId, date, regularTime }))
								);
								setOpen(false);
								setSelected([]);
							}}
						>
							{selected.length === 0
								? "Pick dates"
								: `Create ${selected.length} ${selected.length === 1 ? "Activity" : "Activities"}`}
						</Button>
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</>
	);
}
