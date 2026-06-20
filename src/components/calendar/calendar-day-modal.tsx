import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import TripBuilderModal from "@/components/trips/trip-builder-modal";
import TripEditModal from "@/components/trips/trip-edit-modal";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import { formatDuration, getDuration, isHoliday } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { Car, Clock, Link2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

dayjs.extend(utc);

interface Props {
	day: Dayjs | null;
	activities: ActivityByDateRangeOutput;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddActivity: () => void;
	onRefresh?: () => void;
}

const CalendarDayModal = ({
	day,
	activities,
	open,
	onOpenChange,
	onAddActivity,
	onRefresh
}: Props) => {
	const [tripBuilderOpen, setTripBuilderOpen] = useState(false);
	const [tripEditOpen, setTripEditOpen] = useState(false);

	const existingTripId = activities.find((a) => a.tripId)?.tripId;
	const { data: existingTrip } = trpc.trip.getByDate.useQuery(
		{ date: day?.toDate() ?? new Date() },
		{ enabled: !!day && !!existingTripId }
	);

	if (!day) return null;

	const holiday = isHoliday(day.toDate());

	const eligibleForTrip = activities.filter(
		(a) => a.startTime && a.endTime && !a.tripId
	);
	const canCreateTrip = eligibleForTrip.length >= 2;
	const hasExistingTrip = !!existingTrip;

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

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					{hasExistingTrip && (
						<Button
							variant="outline"
							onClick={() => setTripEditOpen(true)}
							className="w-full sm:w-auto"
						>
							<Pencil className="h-4 w-4" />
							Edit Trip
						</Button>
					)}
					{canCreateTrip && (
						<Button
							variant="outline"
							onClick={() => setTripBuilderOpen(true)}
							className="w-full sm:w-auto"
						>
							<Link2 className="h-4 w-4" />
							Create Back-to-Back
						</Button>
					)}
					<Button onClick={onAddActivity} className="w-full sm:flex-1">
						<Plus className="h-4 w-4" />
						Add Activity
					</Button>
				</DialogFooter>
			</DialogContent>

			<TripBuilderModal
				date={day.toDate()}
				activities={activities}
				open={tripBuilderOpen}
				onOpenChange={setTripBuilderOpen}
				onSuccess={() => onRefresh?.()}
			/>

			{existingTrip && (
				<TripEditModal
					trip={existingTrip}
					open={tripEditOpen}
					onOpenChange={setTripEditOpen}
					onSuccess={() => onRefresh?.()}
				/>
			)}
		</Dialog>
	);
};

interface ActivityRowProps {
	activity: ActivityByDateRangeOutput[number];
}

const ActivityRow = ({ activity }: ActivityRowProps) => {
	const isInvoiced = activity.invoiceId !== null;
	const isInTrip = activity.tripId !== null;
	const cost = getTotalCostOfActivities([activity]);

	return (
		<Link
			href={`/dashboard/activities/${activity.id}`}
			className={cn(
				"hover:bg-muted/50 flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors",
				isInvoiced && "opacity-50",
				isInTrip && "border-primary/20 border-l-2 pl-3"
			)}
		>
			<div className="flex min-w-0 flex-col gap-1">
				<div className="flex items-center gap-2">
					<p className="truncate text-sm font-medium">
						{activity.supportItem.description}
					</p>
					{isInTrip && (
						<Badge variant="outline" className="text-xs">
							<Link2 className="mr-1 h-3 w-3" />
							Back-to-back
						</Badge>
					)}
				</div>

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
