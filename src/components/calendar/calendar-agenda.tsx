import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { formatDuration, getDuration, isHoliday } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { Car, Clock } from "lucide-react";
import Link from "next/link";

dayjs.extend(utc);

interface Props {
	currentMonth: Dayjs;
	activities: ActivityByDateRangeOutput;
	isLoading: boolean;
}

function groupByDate(activities: ActivityByDateRangeOutput) {
	const groups: { date: string; activities: ActivityByDateRangeOutput }[] = [];
	const map = new Map<string, ActivityByDateRangeOutput>();

	for (const activity of activities) {
		const key = dayjs(activity.date).format("YYYY-MM-DD");
		const existing = map.get(key);
		if (existing) {
			existing.push(activity);
		} else {
			const group: ActivityByDateRangeOutput = [activity];
			map.set(key, group);
			groups.push({ date: key, activities: group });
		}
	}

	return groups;
}

const CalendarAgenda = ({ currentMonth, activities, isLoading }: Props) => {
	if (isLoading) {
		return <AgendaSkeleton />;
	}

	const groups = groupByDate(activities);

	if (groups.length === 0) {
		return (
			<p className="text-muted-foreground py-12 text-center text-sm">
				No activities in {currentMonth.format("MMMM YYYY")}.
			</p>
		);
	}

	return (
		<div className="flex flex-col divide-y">
			{groups.map(({ date, activities: dayActivities }) => {
				const day = dayjs(date);
				const holiday = isHoliday(day.toDate());
				const dayCost = getTotalCostOfActivities(dayActivities);

				return (
					<div key={date} className="py-3">
						<div className="flex items-center justify-between px-2 pb-2">
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold">
									{day.format("ddd D MMM")}
								</span>
								{holiday && <Badge variant="success">Holiday</Badge>}
							</div>
							<span className="text-muted-foreground text-xs">
								{dayCost.toLocaleString(undefined, {
									style: "currency",
									currency: "AUD",
									minimumFractionDigits: 0
								})}
							</span>
						</div>

						<div className="flex flex-col">
							{dayActivities.map((activity) => (
								<AgendaRow key={activity.id} activity={activity} />
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
};

interface AgendaRowProps {
	activity: ActivityByDateRangeOutput[number];
}

const AgendaRow = ({ activity }: AgendaRowProps) => {
	const isInvoiced = activity.invoiceId !== null;
	const cost = getTotalCostOfActivities([activity]);

	return (
		<Link
			href={`/dashboard/activities/${activity.id}`}
			className={cn(
				"hover:bg-muted/50 flex items-center justify-between gap-4 rounded-md px-2 py-2.5 transition-colors",
				isInvoiced && "opacity-50"
			)}
		>
			<div className="flex min-w-0 flex-col gap-1">
				<p className="truncate text-sm font-medium">
					{activity.supportItem.description}
				</p>

				<div className="text-muted-foreground flex items-center gap-3 text-xs">
					{activity.client && <span>{activity.client.name}</span>}

					{activity.itemDistance ? (
						<span className="flex items-center gap-1">
							<Car className="h-3 w-3" />
							{activity.itemDistance}km
						</span>
					) : activity.startTime && activity.endTime ? (
						<span className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{dayjs.utc(activity.startTime).format("H:mm")} -{" "}
							{dayjs.utc(activity.endTime).format("H:mm")} (
							{formatDuration(
								getDuration(activity.startTime, activity.endTime)
							)}
							)
						</span>
					) : null}

					{isInvoiced && activity.invoice && (
						<span>Invoice #{activity.invoice.invoiceNo}</span>
					)}
				</div>
			</div>

			<span className="text-sm font-medium whitespace-nowrap">
				{cost.toLocaleString(undefined, {
					style: "currency",
					currency: "AUD",
					minimumFractionDigits: 0
				})}
			</span>
		</Link>
	);
};

const AgendaSkeleton = () => (
	<div className="flex flex-col divide-y">
		{Array.from({ length: 5 }).map((_, i) => (
			<div key={i} className="py-3">
				<div className="flex items-center justify-between px-2 pb-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-12" />
				</div>
				<div className="flex flex-col gap-2 px-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</div>
		))}
	</div>
);

export default CalendarAgenda;
