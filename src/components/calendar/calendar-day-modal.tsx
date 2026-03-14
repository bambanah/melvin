import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { formatDuration, getDuration, isHoliday } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { Car, Clock, Plus } from "lucide-react";
import Link from "next/link";

dayjs.extend(utc);

interface Props {
	day: Dayjs | null;
	activities: ActivityByDateRangeOutput;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddActivity: () => void;
}

const CalendarDayModal = ({
	day,
	activities,
	open,
	onOpenChange,
	onAddActivity
}: Props) => {
	if (!day) return null;

	const holiday = isHoliday(day.toDate());

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[100dvh] overflow-y-auto max-sm:h-full max-sm:max-w-full max-sm:rounded-none sm:max-h-[80vh] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{day.format("dddd D MMMM")}
						{holiday && <Badge variant="success">Holiday</Badge>}
					</DialogTitle>
				</DialogHeader>

				{activities.length === 0 ? (
					<p className="text-muted-foreground py-4 text-center text-sm">
						No activities on this day.
					</p>
				) : (
					<div className="flex flex-col divide-y">
						{activities.map((activity) => (
							<ActivityRow key={activity.id} activity={activity} />
						))}
					</div>
				)}

				<DialogFooter>
					<Button onClick={onAddActivity} className="w-full">
						<Plus className="h-4 w-4" />
						Add Activity
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

interface ActivityRowProps {
	activity: ActivityByDateRangeOutput[number];
}

const ActivityRow = ({ activity }: ActivityRowProps) => {
	const isInvoiced = activity.invoiceId !== null;
	const cost = getTotalCostOfActivities([activity]);

	return (
		<Link
			href={`/dashboard/activities/${activity.id}`}
			className={cn(
				"hover:bg-muted/50 flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors",
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
				</div>

				{isInvoiced && activity.invoice && (
					<span className="text-muted-foreground text-xs">
						Invoice #{activity.invoice.invoiceNo}
					</span>
				)}
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

export default CalendarDayModal;
