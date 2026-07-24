import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
import {
	addDays,
	format,
	getDay,
	getDaysInMonth,
	getMonth,
	startOfMonth,
	subDays
} from "date-fns";
import { useCallback, useMemo, useRef, useState } from "react";
import CalendarDayCell from "./calendar-day-cell";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface Props {
	currentMonth: Date;
	activities: ActivityByDateRangeOutput;
	isLoading: boolean;
	onDayClick: (day: Date) => void;
}

function getCalendarDays(month: Date) {
	const firstOfMonth = startOfMonth(month);
	// getDay is 0=Sun, we want 0=Mon
	const startDay = (getDay(firstOfMonth) + 6) % 7;
	const calendarStart = subDays(firstOfMonth, startDay);

	const daysInMonth = getDaysInMonth(month);
	const totalCells = startDay + daysInMonth;
	const totalRows = Math.ceil(totalCells / 7);
	const totalDays = totalRows * 7;

	const days: Date[] = [];
	for (let i = 0; i < totalDays; i++) {
		days.push(addDays(calendarStart, i));
	}

	return days;
}

function groupActivitiesByDate(activities: ActivityByDateRangeOutput) {
	const map = new Map<string, ActivityByDateRangeOutput>();
	for (const activity of activities) {
		const key = format(new Date(activity.date), "yyyy-MM-dd");
		const existing = map.get(key);
		if (existing) {
			existing.push(activity);
		} else {
			map.set(key, [activity]);
		}
	}
	return map;
}

const CalendarMonth = ({
	currentMonth,
	activities,
	isLoading,
	onDayClick
}: Props) => {
	const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
	const activitiesByDate = useMemo(
		() => groupActivitiesByDate(activities),
		[activities]
	);

	const today = format(new Date(), "yyyy-MM-dd");
	const gridRef = useRef<HTMLDivElement>(null);

	// Track focused day index for keyboard navigation
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (focusedIndex === null) return;

			let nextIndex: number | null = null;

			switch (e.key) {
				case "ArrowRight":
					nextIndex = Math.min(focusedIndex + 1, days.length - 1);
					break;
				case "ArrowLeft":
					nextIndex = Math.max(focusedIndex - 1, 0);
					break;
				case "ArrowDown":
					nextIndex = Math.min(focusedIndex + 7, days.length - 1);
					break;
				case "ArrowUp":
					nextIndex = Math.max(focusedIndex - 7, 0);
					break;
				case "Enter":
				case " ":
					e.preventDefault();
					onDayClick(days[focusedIndex]);
					return;
				default:
					return;
			}

			e.preventDefault();
			setFocusedIndex(nextIndex);

			// Focus the button at the new index
			const buttons = gridRef.current?.querySelectorAll("button");
			if (buttons && nextIndex !== null) {
				(buttons[nextIndex] as HTMLButtonElement)?.focus();
			}
		},
		[focusedIndex, days, onDayClick]
	);

	const handleFocus = useCallback((index: number) => {
		setFocusedIndex(index);
	}, []);

	if (isLoading) {
		return <CalendarSkeleton />;
	}

	return (
		<div className="flex flex-col">
			<div className="grid grid-cols-7 border-b">
				{DAYS_OF_WEEK.map((day) => (
					<div
						key={day}
						className="text-muted-foreground py-2 text-center text-xs font-medium sm:text-sm"
					>
						{day}
					</div>
				))}
			</div>

			<div
				ref={gridRef}
				className="grid grid-cols-7"
				role="grid"
				aria-label={format(currentMonth, "MMMM yyyy")}
				onKeyDown={handleKeyDown}
			>
				{days.map((day, index) => {
					const dateKey = format(day, "yyyy-MM-dd");
					const isCurrentMonth = getMonth(day) === getMonth(currentMonth);
					const isToday = dateKey === today;
					const dayActivities = activitiesByDate.get(dateKey) ?? [];

					return (
						<CalendarDayCell
							key={dateKey}
							day={day}
							activities={dayActivities}
							isCurrentMonth={isCurrentMonth}
							isToday={isToday}
							isFocused={focusedIndex === index}
							onDayClick={(d) => {
								handleFocus(index);
								onDayClick(d);
							}}
						/>
					);
				})}
			</div>
		</div>
	);
};

const CalendarSkeleton = () => (
	<div className="flex flex-col">
		<div className="grid grid-cols-7 border-b">
			{DAYS_OF_WEEK.map((day) => (
				<div
					key={day}
					className="text-muted-foreground py-2 text-center text-xs font-medium sm:text-sm"
				>
					{day}
				</div>
			))}
		</div>
		<div className="grid grid-cols-7">
			{Array.from({ length: 35 }).map((_, i) => (
				<div
					key={i}
					className={cn(
						"border-border flex h-16 flex-col gap-1 border-r border-b p-1 sm:h-32",
						i % 7 === 0 && "border-l"
					)}
				>
					<Skeleton className="h-4 w-6" />
					<Skeleton className="hidden h-4 w-full sm:block" />
				</div>
			))}
		</div>
	</div>
);

export default CalendarMonth;
