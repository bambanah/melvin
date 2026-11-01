// PROTOTYPE - throwaway (#502). Variant D: start from the Clients list. A
// "Regular time" card above the list: one row per Client with a Regular Time,
// one column per day of a week, a tick per cell. Fills several Clients' week at
// once. Cells already holding an Activity show a dot and start unticked.
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
	addDays,
	addWeeks,
	format,
	isAfter,
	startOfDay,
	startOfWeek,
	subWeeks
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
	createActivities,
	dateKey,
	useApplyVariant,
	useClientsWithRegularTime,
	useExistingDates
} from "./apply-store";
import { formatSpan, useAllRegularTimes } from "./store";

export function WeekGrid() {
	const variant = useApplyVariant();
	const regularTimes = useAllRegularTimes();
	const clients = useClientsWithRegularTime(regularTimes);
	const existingByClient = useExistingDates();
	const today = startOfDay(new Date());
	const thisWeek = startOfWeek(today, { weekStartsOn: 1 });
	const [weekStart, setWeekStart] = useState(thisWeek);
	// "clientId|yyyy-MM-dd"
	const [selected, setSelected] = useState<Set<string>>(new Set());

	if (variant !== "D") return null;

	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	const toggle = (cell: string) => {
		const next = new Set(selected);
		if (next.has(cell)) next.delete(cell);
		else next.add(cell);
		setSelected(next);
	};

	return (
		<section className="mx-auto mb-6 w-full max-w-4xl rounded-lg border">
			<div className="flex items-center justify-between gap-2 border-b px-4 py-3">
				<div>
					<h2 className="font-semibold">Regular time</h2>
					<p className="text-muted-foreground text-xs">
						Tick the days each Client got their usual work
					</p>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Previous week"
						onClick={() => setWeekStart(subWeeks(weekStart, 1))}
					>
						<ChevronLeft />
					</Button>
					<span className="min-w-28 text-center text-sm">
						{weekStart.getTime() === thisWeek.getTime()
							? "This week"
							: `Week of ${format(weekStart, "d MMM")}`}
					</span>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Next week"
						disabled={weekStart >= thisWeek}
						onClick={() => setWeekStart(addWeeks(weekStart, 1))}
					>
						<ChevronRight />
					</Button>
				</div>
			</div>

			{clients.length === 0 ? (
				<p className="text-muted-foreground px-4 py-6 text-sm">
					No Client has a regular time yet. Set one on a Client page.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-muted-foreground text-xs">
								<th className="px-4 py-2 text-left font-medium">Client</th>
								{days.map((d) => (
									<th key={d.toISOString()} className="px-1 py-2 font-medium">
										<div>{format(d, "EEE")}</div>
										<div>{format(d, "d")}</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{clients.map((c) => {
								const rt = regularTimes.get(c.id)!;
								const existing = existingByClient.get(c.id);
								return (
									<tr key={c.id} className="border-t">
										<td className="px-4 py-2">
											<div className="font-medium">{c.name}</div>
											<div className="text-muted-foreground text-xs">
												{formatSpan(rt)}
												{rt.claimsTravel ? " + travel" : ""}
											</div>
										</td>
										{days.map((d) => {
											const key = dateKey(d);
											const cell = `${c.id}|${key}`;
											const future = isAfter(d, today);
											const has = existing?.has(key);
											return (
												<td key={key} className="px-1 py-2 text-center">
													{future ? null : (
														<div className="relative inline-flex">
															<Checkbox
																checked={selected.has(cell)}
																onCheckedChange={() => toggle(cell)}
																aria-label={`${c.name} ${key}`}
																className={cn(has && "border-destructive")}
															/>
															{has && (
																<span
																	className="bg-destructive absolute -top-1 -right-1 size-1.5 rounded-full"
																	title="Already has an Activity"
																/>
															)}
														</div>
													)}
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<div className="flex items-center justify-between gap-2 border-t px-4 py-3">
				<p className="text-muted-foreground flex items-center gap-1.5 text-xs">
					<span className="bg-destructive size-1.5 rounded-full" />
					Already has an Activity
				</p>
				<Button
					size="sm"
					disabled={selected.size === 0}
					onClick={() => {
						createActivities(
							[...selected].map((cell) => {
								const [clientId, key] = cell.split("|");
								return {
									clientId,
									date: new Date(`${key}T00:00`),
									regularTime: regularTimes.get(clientId)!
								};
							})
						);
						setSelected(new Set());
					}}
				>
					{selected.size === 0
						? "Tick days"
						: `Create ${selected.size} ${selected.size === 1 ? "Activity" : "Activities"}`}
				</Button>
			</div>
		</section>
	);
}
