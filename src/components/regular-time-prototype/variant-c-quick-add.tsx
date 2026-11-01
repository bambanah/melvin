// PROTOTYPE - throwaway (#502). Variant C: start from quick add (the FAB on a
// phone, a calendar day's "Add Activity" on desktop). A "Regular time" tab
// beside the normal rows: one chip per Client with a Regular Time, then the
// recent days as a checklist, newest first. The day quick add was opened for is
// ticked unless it already has an Activity for that Client.
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, isToday, startOfDay, subDays } from "date-fns";
import { useState } from "react";
import {
	createActivities,
	dateKey,
	LOOKBACK_DAYS,
	useClientsWithRegularTime,
	useExistingDates
} from "./apply-store";
import { formatSpan, useAllRegularTimes } from "./store";

const PAGE = 14;

export function QuickAddTabs({
	tab,
	onTabChange
}: {
	tab: "custom" | "regular";
	onTabChange: (tab: "custom" | "regular") => void;
}) {
	return (
		<div className="bg-muted flex rounded-md p-0.5">
			{(["custom", "regular"] as const).map((t) => (
				<button
					key={t}
					type="button"
					onClick={() => onTabChange(t)}
					className={cn(
						"flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
						tab === t
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					)}
				>
					{t === "custom" ? "Activities" : "Regular time"}
				</button>
			))}
		</div>
	);
}

export function RegularTimeTab({
	date,
	onDone
}: {
	date: Date;
	onDone: () => void;
}) {
	const regularTimes = useAllRegularTimes();
	const clients = useClientsWithRegularTime(regularTimes);
	const existingByClient = useExistingDates();
	const [clientId, setClientId] = useState<string>();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [days, setDays] = useState(PAGE);

	const today = startOfDay(new Date());
	const anchor = startOfDay(date) > today ? today : startOfDay(date);
	const existing = (clientId && existingByClient.get(clientId)) || new Set();
	const regularTime = clientId ? regularTimes.get(clientId) : undefined;
	const dates = Array.from({ length: days }, (_, i) => subDays(today, i));

	const pickClient = (id: string) => {
		setClientId(id);
		const key = dateKey(anchor);
		setSelected(
			existingByClient.get(id)?.has(key) ? new Set() : new Set([key])
		);
	};

	const toggle = (key: string) => {
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		setSelected(next);
	};

	if (clients.length === 0) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No Client has a regular time yet. Set one on a Client page.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-2">
				{clients.map((c) => {
					const rt = regularTimes.get(c.id)!;
					return (
						<button
							key={c.id}
							type="button"
							onClick={() => pickClient(c.id)}
							className={cn(
								"flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
								clientId === c.id
									? "border-primary bg-primary/10"
									: "hover:bg-accent"
							)}
						>
							<span className="text-sm font-medium">{c.name}</span>
							<span className="text-muted-foreground text-xs">
								{formatSpan(rt)}
								{rt.claimsTravel ? " + travel" : ""}
							</span>
						</button>
					);
				})}
			</div>

			{regularTime && (
				<>
					<div className="flex flex-col divide-y rounded-lg border">
						{dates.map((d) => {
							const key = dateKey(d);
							const has = existing.has(key);
							return (
								<label
									key={key}
									className="hover:bg-accent/50 flex cursor-pointer items-center gap-3 px-3 py-2"
								>
									<Checkbox
										checked={selected.has(key)}
										onCheckedChange={() => toggle(key)}
									/>
									<span className="text-sm">
										{isToday(d) ? "Today" : format(d, "EEE d MMM")}
									</span>
									{has && (
										<span className="text-destructive ml-auto text-xs">
											Already has an Activity
										</span>
									)}
								</label>
							);
						})}
					</div>
					{days < LOOKBACK_DAYS && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setDays(days + PAGE)}
						>
							Show earlier days
						</Button>
					)}
				</>
			)}

			<Button
				type="button"
				disabled={!regularTime || selected.size === 0}
				onClick={() => {
					createActivities(
						[...selected].sort().map((k) => ({
							clientId: clientId!,
							date: new Date(`${k}T00:00`),
							regularTime: regularTime!
						}))
					);
					onDone();
				}}
			>
				{selected.size === 0
					? "Pick dates"
					: `Create ${selected.size} ${selected.size === 1 ? "Activity" : "Activities"}`}
			</Button>
		</div>
	);
}
