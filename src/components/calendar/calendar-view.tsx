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
import { MultiActivityForm } from "@/components/activities/multi-activity-form";

type ViewMode = "calendar" | "list";

const VIEW_MODE_KEY = "calendar-view-mode";

function getStoredViewMode(): ViewMode {
	if (typeof window === "undefined") return "calendar";
	return localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "calendar";
}

const CalendarView = () => {
	const [currentMonth, setCurrentMonth] = useState(() =>
		dayjs().startOf("month")
	);
	// Safe to read localStorage in the initializer: `Layout` renders a skeleton
	// (not this view) until the session resolves client-side, so CalendarView
	// never renders during SSR and there is no server markup to mismatch.
	const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);

	const handleViewModeChange = useCallback((mode: ViewMode) => {
		setViewMode(mode);
		localStorage.setItem(VIEW_MODE_KEY, mode);
	}, []);
	const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);
	const [quickAddDay, setQuickAddDay] = useState<Dayjs | null>(null);

	const startDate = currentMonth.toDate();
	const endDate = currentMonth.add(1, "month").toDate();

	const {
		data: activities,
		isLoading,
		refetch
	} = trpc.activity.byDateRange.useQuery({
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
	const isMonthView = viewMode === "calendar";

	return (
		<Layout className="mx-auto w-full max-w-7xl gap-4 px-2 sm:px-4">
			<div className="flex items-center justify-between pb-4">
				<div className="flex items-center gap-2">
					{isMonthView && (
						<h1 className="text-xl font-semibold sm:text-2xl">
							{currentMonth.format("MMMM YYYY")}
						</h1>
					)}
				</div>

				<div className="flex items-center gap-1">
					<ViewToggle
						viewMode={viewMode}
						onViewModeChange={handleViewModeChange}
					/>

					{isMonthView && (
						<>
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
						</>
					)}
				</div>
			</div>

			{isMonthView ? (
				<CalendarMonth
					currentMonth={currentMonth}
					activities={activities ?? []}
					isLoading={isLoading}
					onDayClick={handleDayClick}
				/>
			) : (
				<CalendarAgenda />
			)}

			<CalendarDayModal
				day={selectedDay}
				activities={selectedDayActivities}
				open={selectedDay !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedDay(null);
				}}
				onAddActivity={handleAddActivity}
				onRefresh={() => refetch()}
			/>

			<MultiActivityForm
				key={quickAddDay?.toISOString() ?? "closed"}
				date={quickAddDay?.toDate() ?? null}
				open={quickAddDay !== null}
				onOpenChange={(open) => {
					if (!open) setQuickAddDay(null);
				}}
				onSuccess={() => {
					refetch();
					setQuickAddDay(null);
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
