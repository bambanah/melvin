import { cn } from "@/lib/utils";
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import Link from "next/link";

dayjs.extend(utc);

const MAX_VISIBLE_ACTIVITIES = 3;

interface Props {
	day: Dayjs;
	activities: ActivityByDateRangeOutput;
	isCurrentMonth: boolean;
	isToday: boolean;
	isFocused: boolean;
	onDayClick: (day: Dayjs) => void;
}

const CalendarDayCell = ({
	day,
	activities,
	isCurrentMonth,
	isToday,
	isFocused,
	onDayClick
}: Props) => {
	const visibleActivities = activities.slice(0, MAX_VISIBLE_ACTIVITIES);
	const overflowCount = activities.length - MAX_VISIBLE_ACTIVITIES;
	const hasActivities = activities.length > 0;

	return (
		<button
			type="button"
			onClick={() => onDayClick(day)}
			tabIndex={isFocused ? 0 : -1}
			className={cn(
				"border-border hover:bg-accent/50 flex h-16 cursor-pointer flex-col border-r border-b p-1 text-left transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset sm:h-32",
				day.day() === 1 && "border-l",
				!isCurrentMonth && "bg-muted/30",
				isCurrentMonth && !hasActivities && "bg-muted/10",
				isFocused && "ring-ring ring-2 ring-inset"
			)}
		>
			<div className="flex items-center justify-between">
				<span
					className={cn(
						"inline-flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm",
						!isCurrentMonth && "text-muted-foreground/50",
						isToday && "bg-primary text-primary-foreground font-semibold"
					)}
				>
					{day.date()}
				</span>
			</div>

			{/* Mobile: activity dots */}
			{hasActivities && (
				<div className="mt-auto flex items-center gap-0.5 sm:hidden">
					{activities.slice(0, 4).map((activity) => (
						<span
							key={activity.id}
							className={cn(
								"bg-primary/60 h-1.5 w-1.5 rounded-full",
								activity.invoiceId !== null && "bg-muted-foreground/40"
							)}
						/>
					))}
					{activities.length > 4 && (
						<span className="text-muted-foreground text-[9px] leading-none">
							+{activities.length - 4}
						</span>
					)}
				</div>
			)}

			{/* Desktop: activity cards */}
			<div className="hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
				{visibleActivities.map((activity) => (
					<ActivityCard key={activity.id} activity={activity} />
				))}

				{overflowCount > 0 && (
					<span className="text-muted-foreground truncate px-1 text-xs">
						+{overflowCount} more
					</span>
				)}
			</div>
		</button>
	);
};

interface ActivityCardProps {
	activity: ActivityByDateRangeOutput[number];
}

const ActivityCard = ({ activity }: ActivityCardProps) => {
	const isInvoiced = activity.invoiceId !== null;

	const timeLabel = activity.itemDistance
		? `${activity.itemDistance}km`
		: activity.startTime
			? dayjs.utc(activity.startTime).format("H:mm")
			: "";

	const clientName = activity.client?.name ?? "";

	return (
		<Link
			href={`/dashboard/activities/${activity.id}`}
			onClick={(e) => e.stopPropagation()}
			className={cn(
				"bg-primary/10 hover:bg-primary/20 truncate rounded px-1 py-0.5 text-xs leading-tight transition-colors",
				isInvoiced && "bg-muted text-muted-foreground opacity-50"
			)}
		>
			<span className="font-medium">{clientName}</span>
			{timeLabel && (
				<span className="text-muted-foreground ml-1">{timeLabel}</span>
			)}
		</Link>
	);
};

export default CalendarDayCell;
