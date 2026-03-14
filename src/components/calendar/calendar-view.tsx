import Layout from "@/components/shared/layout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import CalendarAgenda from "./calendar-agenda";
import CalendarDayModal from "./calendar-day-modal";
import CalendarMonth from "./calendar-month";
import QuickAddForm from "./quick-add-form";

type ViewMode = "calendar" | "list";

const CalendarView = () => {
	const [currentMonth, setCurrentMonth] = useState(() =>
		dayjs().startOf("month")
	);
	const [viewMode, setViewMode] = useState<ViewMode>("calendar");
	const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);
	const [quickAddDay, setQuickAddDay] = useState<Dayjs | null>(null);

	const startDate = currentMonth.toDate();
	const endDate = currentMonth.add(1, "month").toDate();

	const { data: activities, isLoading } = trpc.activity.byDateRange.useQuery({
		startDate,
		endDate
	});

	const activitiesByDate = useMemo(() => {
		const map = new Map<string, ActivityByDateRangeOutput>();
		for (const activity of activities ?? []) {
			const key = dayjs(activity.date).format("YYYY-MM-DD");
			const existing = map.get(key);
			if (existing) {
				existing.push(activity);
			} else {
				map.set(key, [activity]);
			}
		}
		return map;
	}, [activities]);

	const selectedDayActivities = selectedDay
		? (activitiesByDate.get(selectedDay.format("YYYY-MM-DD")) ?? [])
		: [];

	const handleDayClick = useCallback((day: Dayjs) => {
		setSelectedDay(day);
	}, []);

	const handleAddActivity = useCallback(() => {
		setQuickAddDay(selectedDay);
		setSelectedDay(null);
	}, [selectedDay]);

	const goToPreviousMonth = () => {
		setCurrentMonth((prev) => prev.subtract(1, "month"));
	};

	const goToNextMonth = () => {
		setCurrentMonth((prev) => prev.add(1, "month"));
	};

	const goToToday = () => {
		setCurrentMonth(dayjs().startOf("month"));
	};

	const isCurrentMonth = currentMonth.isSame(dayjs(), "month");

	return (
		<Layout className="mx-auto w-full max-w-7xl gap-4 px-2 sm:px-4">
			<div className="flex items-center justify-between pb-4">
				<div className="flex items-center gap-2">
					<h1 className="text-xl font-semibold sm:text-2xl">
						{currentMonth.format("MMMM YYYY")}
					</h1>
				</div>

				<div className="flex items-center gap-1">
					<ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

					<div className="bg-border mx-1 h-6 w-px" />

					<Button
						variant="outline"
						size="sm"
						onClick={goToToday}
						disabled={isCurrentMonth}
					>
						Today
					</Button>
					<Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" onClick={goToNextMonth}>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{viewMode === "calendar" ? (
				<CalendarMonth
					currentMonth={currentMonth}
					activities={activities ?? []}
					isLoading={isLoading}
					onDayClick={handleDayClick}
				/>
			) : (
				<CalendarAgenda
					currentMonth={currentMonth}
					activities={activities ?? []}
					isLoading={isLoading}
				/>
			)}

			<CalendarDayModal
				day={selectedDay}
				activities={selectedDayActivities}
				open={selectedDay !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedDay(null);
				}}
				onAddActivity={handleAddActivity}
			/>

			<QuickAddForm
				day={quickAddDay}
				open={quickAddDay !== null}
				onOpenChange={(open) => {
					if (!open) setQuickAddDay(null);
				}}
			/>
		</Layout>
	);
};

interface ViewToggleProps {
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
}

const ViewToggle = ({ viewMode, onViewModeChange }: ViewToggleProps) => (
	<div className="bg-muted flex rounded-md p-0.5">
		<button
			type="button"
			onClick={() => onViewModeChange("calendar")}
			className={cn(
				"flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
				viewMode === "calendar"
					? "bg-background text-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground"
			)}
		>
			<CalendarDays className="h-3.5 w-3.5" />
			<span className="hidden sm:inline">Month</span>
		</button>
		<button
			type="button"
			onClick={() => onViewModeChange("list")}
			className={cn(
				"flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
				viewMode === "list"
					? "bg-background text-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground"
			)}
		>
			<List className="h-3.5 w-3.5" />
			<span className="hidden sm:inline">List</span>
		</button>
	</div>
);

export default CalendarView;
