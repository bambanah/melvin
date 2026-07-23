import { Badge } from "@/components/ui/badge";
import {
	calculateTripTransit,
	sortActivitiesByTime,
	type TransitValues
} from "@/lib/trip-utils";
import type { ActivityByIdOutput } from "@/server/api/routers/activity-router";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { MapPin } from "lucide-react";
import Link from "next/link";

dayjs.extend(require("dayjs/plugin/utc"));

type Trip = NonNullable<ActivityByIdOutput["trip"]>;
type Leg = Trip["activities"][number];

const formatMinutes = (minutes: number) => `${Math.round(minutes)} min`;

const positionLabel = (index: number, count: number) => {
	if (index === 0) return "From home";
	if (index === count - 1) return "Return home";
	return "Between clients";
};

const timeSpan = (leg: Leg) =>
	leg.startTime && leg.endTime
		? `${dayjs.utc(leg.startTime).format("HH:mm")} - ${dayjs
				.utc(leg.endTime)
				.format("HH:mm")}`
		: null;

function LegRow({
	leg,
	index,
	count,
	isCurrent,
	transit
}: {
	leg: Leg;
	index: number;
	count: number;
	isCurrent: boolean;
	transit?: TransitValues;
}) {
	const span = timeSpan(leg);
	const inner = (
		<div
			className={cn(
				"flex flex-col gap-1 rounded-md border p-3",
				isCurrent
					? "border-primary bg-primary/5"
					: "hover:bg-foreground/5 transition-colors"
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="font-medium">
					{leg.client?.name ?? "Unknown client"}
				</span>
				<Badge variant="secondary">{positionLabel(index, count)}</Badge>
			</div>
			{span && <p className="text-foreground/70 text-sm">{span}</p>}
			{transit &&
				(transit.transitDistance > 0 || transit.transitDuration > 0) && (
					<p className="text-foreground/60 text-xs">
						Provider travel: {transit.transitDistance} km ·{" "}
						{formatMinutes(transit.transitDuration)}
						{index === count - 1 && count > 1 && " (incl. return home)"}
						{transit.durationCapped && " · capped at 30 min"}
					</p>
				)}
		</div>
	);

	if (isCurrent) return inner;

	return (
		<Link href={`/dashboard/activities/${leg.id}`} className="block">
			{inner}
		</Link>
	);
}

function ActivityTripSummary({
	trip,
	currentActivityId
}: {
	trip: Trip;
	currentActivityId: string;
}) {
	const sorted = sortActivitiesByTime(trip.activities);
	const transit = calculateTripTransit(trip.activities, trip.interClientLegs);

	let totalDistance = 0;
	let totalDuration = 0;
	for (const values of transit.values()) {
		totalDistance += values.transitDistance;
		totalDuration += values.transitDuration;
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center gap-2">
				<MapPin className="h-4 w-4" />
				<p className="font-semibold">Trip ({sorted.length} legs)</p>
			</div>

			<div className="flex flex-col gap-2">
				{sorted.map((leg, index) => (
					<LegRow
						key={leg.id}
						leg={leg}
						index={index}
						count={sorted.length}
						isCurrent={leg.id === currentActivityId}
						transit={transit.get(leg.id)}
					/>
				))}
			</div>

			<div className="flex items-center justify-between border-t pt-3 text-sm">
				<p className="font-semibold">Total trip transit</p>
				<p className="font-semibold">
					{totalDistance} km · {formatMinutes(totalDuration)}
				</p>
			</div>
		</div>
	);
}

export default ActivityTripSummary;
