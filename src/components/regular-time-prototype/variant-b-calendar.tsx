// PROTOTYPE - throwaway (#502). Variant B: start from the calendar. A "Regular
// time" header button turns the month grid into a date picker for one Client:
// tapping days toggles them instead of opening the day modal, future days are
// dead, and days already holding an Activity for that Client are outlined.
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isAfter, startOfDay } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	createActivities,
	dateKey,
	useApplyVariant,
	useClientsWithRegularTime,
	useExistingDates
} from "./apply-store";
import { formatSpan, useAllRegularTimes } from "./store";

export function useCalendarSelectMode() {
	const variant = useApplyVariant();
	const regularTimes = useAllRegularTimes();
	const clients = useClientsWithRegularTime(regularTimes);
	const existingByClient = useExistingDates();
	const [active, setActive] = useState(false);
	const [clientId, setClientId] = useState<string>();
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const enabled = variant === "B";
	const on = enabled && active;
	const today = startOfDay(new Date());
	const existing = (clientId && existingByClient.get(clientId)) || new Set();
	const regularTime = clientId ? regularTimes.get(clientId) : undefined;

	const stop = () => {
		setActive(false);
		setSelected(new Set());
	};

	const toggle = (day: Date) => {
		if (isAfter(day, today) || !clientId) return;
		const key = dateKey(day);
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		setSelected(next);
	};

	const headerButton: ReactNode = enabled && !active && (
		<Button
			variant="outline"
			size="sm"
			onClick={() => {
				setActive(true);
				if (!clientId && clients.length === 1) setClientId(clients[0].id);
			}}
		>
			<CalendarClock className="h-4 w-4" />
			<span className="hidden sm:inline">Regular time</span>
		</Button>
	);

	const bar: ReactNode = on && (
		<div className="bg-primary/5 border-primary/30 sticky top-0 z-20 mb-2 flex flex-wrap items-center gap-2 rounded-lg border p-2">
			<Select
				value={clientId}
				onValueChange={(id) => {
					setClientId(id);
					setSelected(new Set());
				}}
			>
				<SelectTrigger className="bg-background w-48">
					<SelectValue placeholder="Which Client?" />
				</SelectTrigger>
				<SelectContent>
					{clients.map((c) => (
						<SelectItem key={c.id} value={c.id}>
							{c.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<span className="text-muted-foreground text-sm">
				{clients.length === 0
					? "No Client has a regular time yet - set one on a Client page"
					: regularTime
						? `${formatSpan(regularTime)}${regularTime.claimsTravel ? ", with travel" : ", no travel"} - tap past days to add`
						: "Pick a Client, then tap days"}
			</span>
			<div className="ml-auto flex items-center gap-1">
				<Button
					size="sm"
					disabled={selected.size === 0 || !regularTime}
					onClick={() => {
						createActivities(
							[...selected].sort().map((k) => ({
								clientId: clientId!,
								date: new Date(`${k}T00:00`),
								regularTime: regularTime!
							}))
						);
						stop();
					}}
				>
					Create {selected.size || ""}
					{selected.size === 1 ? " Activity" : " Activities"}
				</Button>
				<Button size="icon" variant="ghost" onClick={stop} aria-label="Done">
					<X />
				</Button>
			</div>
		</div>
	);

	return {
		on,
		headerButton,
		bar,
		onDayClick: toggle,
		dayClassName: (day: Date) => {
			if (!on) return undefined;
			const key = dateKey(day);
			return cn(
				"[&_a]:pointer-events-none",
				isAfter(day, today) && "pointer-events-none opacity-30",
				existing.has(key) && "ring-destructive/70 ring-2 ring-inset",
				selected.has(key) && "bg-primary/25 hover:bg-primary/30"
			);
		},
		dayBadge: (day: Date) => {
			if (!on) return null;
			const key = dateKey(day);
			const isSelected = selected.has(key);
			const hasExisting = existing.has(key);
			if (!isSelected && !hasExisting) return null;
			return (
				<span
					className={cn(
						"rounded px-1 text-[10px] leading-4 font-medium",
						isSelected
							? "bg-primary text-primary-foreground"
							: "text-destructive"
					)}
				>
					{isSelected ? (hasExisting ? "+ again" : "+ new") : "has one"}
				</span>
			);
		}
	};
}
