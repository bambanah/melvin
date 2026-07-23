import {
	calculateTripTransit,
	sortActivitiesByTime,
	type TransitValues
} from "@/lib/trip-utils";
import type { ActivityByIdOutput } from "@/server/api/routers/activity-router";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
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
		? `${dayjs.utc(leg.startTime).format("h:mma")} - ${dayjs
				.utc(leg.endTime)
				.format("h:mma")}`
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
	const hasTransit =
		transit && (transit.transitDistance > 0 || transit.transitDuration > 0);

	const content = (
		<div
			className={cn(
				"flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-3 py-2",
				isCurrent ? "bg-primary/5" : "hover:bg-foreground/5 transition-colors"
			)}
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
				<p className="text-sm font-medium">
					{leg.client?.name ?? "Unknown client"}
				</p>
				{isCurrent && (
					<span className="text-primary text-xs font-medium tracking-wide uppercase">
						This activity
					</span>
				)}
			</div>
			{span && <p className="text-foreground/60 text-xs">{span}</p>}
			<p className="text-foreground/50 text-xs">
				{positionLabel(index, count)}
				{hasTransit && (
					<>
						{" "}
						· {transit.transitDistance} km ·{" "}
						{formatMinutes(transit.transitDuration)}
						{index === count - 1 && count > 1 && " (incl. return home)"}
						{transit.durationCapped && " · capped at 30 min"}
					</>
				)}
			</p>
		</div>
	);

	return (
		<li className="flex gap-3">
			<div className="flex flex-col items-center pt-3">
				<span
					className={cn(
						"h-3 w-3 shrink-0 rounded-full",
						isCurrent
							? "bg-primary ring-primary/20 ring-4"
							: "border-foreground/30 bg-card border-2"
					)}
				/>
				{index < count - 1 && <span className="bg-border mt-1 w-px flex-1" />}
			</div>
			{isCurrent ? (
				<div className="min-w-0 flex-1 pb-4">{content}</div>
			) : (
				<Link
					href={`/dashboard/activities/${leg.id}`}
					className="min-w-0 flex-1 pb-4"
				>
					{content}
				</Link>
			)}
		</li>
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
		<section className="bg-card overflow-hidden rounded-xl border">
			<div className="flex items-baseline justify-between gap-2 border-b px-5 py-3.5">
				<h2 className="text-sm font-semibold">
					Trip
					<span className="text-foreground/50 font-normal">
						{" "}
						· {sorted.length} stops
					</span>
				</h2>
				<p className="text-foreground/60 text-xs tabular-nums">
					{totalDistance} km · {formatMinutes(totalDuration)} transit
				</p>
			</div>

			<ol className="flex flex-col px-4 pt-3 pb-0">
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
			</ol>
		</section>
	);
}

export default ActivityTripSummary;
