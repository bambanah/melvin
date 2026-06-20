import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sortActivitiesByTime } from "@/lib/trip-utils";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { TripRouterOutput } from "@/server/api/routers/trip-router";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
	AlertTriangle,
	ArrowRight,
	Car,
	Clock,
	Link2,
	Trash2
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

dayjs.extend(utc);

type Trip = NonNullable<TripRouterOutput["getByDate"]>;

interface Props {
	trip: Trip;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

interface InterClientValues {
	fromId: string;
	toId: string;
	distance: string;
	duration: string;
}

const MAX_DURATION = 30;

const TripEditModal = ({ trip, open, onOpenChange, onSuccess }: Props) => {
	const [interClientValues, setInterClientValues] = useState<
		InterClientValues[]
	>([]);

	const updateTripMutation = trpc.trip.update.useMutation();
	const deleteTripMutation = trpc.trip.delete.useMutation();
	const removeActivityMutation = trpc.trip.removeActivity.useMutation();

	const sortedActivities = useMemo(
		() => sortActivitiesByTime(trip.activities),
		[trip.activities]
	);

	const hasInvoicedActivities = useMemo(
		() =>
			trip.activities.some((a) => {
				const activity = a as { invoiceId?: string | null };
				return activity.invoiceId != null;
			}),
		[trip.activities]
	);

	useEffect(() => {
		if (!open) return;

		startTransition(() => {
			const newValues: InterClientValues[] = [];
			for (let i = 0; i < sortedActivities.length - 1; i++) {
				const from = sortedActivities[i];
				const to = sortedActivities[i + 1];

				const existingLeg = trip.interClientLegs.find(
					(leg) =>
						leg.fromActivityId === from.id && leg.toActivityId === to.id
				);

				newValues.push({
					fromId: from.id,
					toId: to.id,
					distance: existingLeg ? String(existingLeg.distance) : "",
					duration: existingLeg ? String(existingLeg.duration) : ""
				});
			}
			setInterClientValues(newValues);
		});
	}, [open, sortedActivities, trip.interClientLegs]);

	const updateInterClientValue = (
		index: number,
		field: "distance" | "duration",
		value: string
	) => {
		const newValues = [...interClientValues];
		newValues[index] = { ...newValues[index], [field]: value };
		setInterClientValues(newValues);
	};

	const getGapWarning = (
		from: (typeof sortedActivities)[number],
		to: (typeof sortedActivities)[number]
	): string | null => {
		if (!from.endTime || !to.startTime) return null;

		const endMinutes =
			dayjs.utc(from.endTime).hour() * 60 + dayjs.utc(from.endTime).minute();
		const startMinutes =
			dayjs.utc(to.startTime).hour() * 60 + dayjs.utc(to.startTime).minute();
		const gapMinutes = startMinutes - endMinutes;

		if (gapMinutes > 120) {
			const hours = Math.floor(gapMinutes / 60);
			const mins = gapMinutes % 60;
			return `${hours}h ${mins}m gap`;
		}
		return null;
	};

	const getDurationWarning = (duration: string): boolean => {
		const num = parseFloat(duration);
		return !isNaN(num) && num > MAX_DURATION;
	};

	const transitSummary = useMemo(() => {
		if (sortedActivities.length < 2) return null;

		const firstActivity = sortedActivities[0];
		const lastActivity = sortedActivities[sortedActivities.length - 1];

		const homeToFirst = Number(firstActivity?.client?.distanceToClient ?? 0);
		const homeToFirstTime = Number(
			firstActivity?.client?.travelTimeToClient ?? 0
		);
		const lastToHome = Number(lastActivity?.client?.distanceToClient ?? 0);
		const lastToHomeTime = Number(
			lastActivity?.client?.travelTimeToClient ?? 0
		);

		const interClientDistance = interClientValues.reduce(
			(sum, v) => sum + (parseFloat(v.distance) || 0),
			0
		);
		const interClientTime = interClientValues.reduce(
			(sum, v) => sum + Math.min(parseFloat(v.duration) || 0, MAX_DURATION),
			0
		);

		const totalDistance = homeToFirst + interClientDistance + lastToHome;
		const totalTime =
			Math.min(homeToFirstTime, MAX_DURATION) +
			interClientTime +
			Math.min(lastToHomeTime, MAX_DURATION);

		return { totalDistance, totalTime };
	}, [sortedActivities, interClientValues]);

	const canSave = interClientValues.every((v) => v.distance && v.duration);

	const handleSave = async () => {
		if (!canSave) return;

		try {
			await updateTripMutation.mutateAsync({
				tripId: trip.id,
				interClientLegs: interClientValues.map((v) => ({
					fromActivityId: v.fromId,
					toActivityId: v.toId,
					distance: parseFloat(v.distance),
					duration: Math.min(parseFloat(v.duration), MAX_DURATION)
				}))
			});

			toast.success("Trip updated");
			onSuccess();
			onOpenChange(false);
		} catch {
			toast.error("Failed to update trip");
		}
	};

	const handleRemoveActivity = async (activityId: string) => {
		try {
			const result = await removeActivityMutation.mutateAsync({
				tripId: trip.id,
				activityId
			});

			if (result.dissolved) {
				toast.success("Trip dissolved — activities restored to standalone");
				onSuccess();
				onOpenChange(false);
			} else {
				toast.success("Activity removed from trip");
				onSuccess();
			}
		} catch {
			toast.error("Failed to remove activity");
		}
	};

	const handleDeleteTrip = async () => {
		try {
			await deleteTripMutation.mutateAsync({ tripId: trip.id });
			toast.success("Trip deleted — activities restored to standalone");
			onSuccess();
			onOpenChange(false);
		} catch {
			toast.error("Failed to delete trip");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						Edit Back-to-Back Trip
					</DialogTitle>
				</DialogHeader>

				{hasInvoicedActivities && (
					<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
						<AlertTriangle className="h-4 w-4 shrink-0" />
						<p className="text-xs">
							This trip contains invoiced activities. Changes will affect
							invoice amounts.
						</p>
					</div>
				)}

				<div className="space-y-6">
					<div>
						<Label className="text-sm font-medium">Activities in trip</Label>
						<p className="text-muted-foreground mb-3 text-xs">
							Activities are ordered by start time. Remove an activity to take
							it out of the trip.
						</p>

						<div className="space-y-2">
							{sortedActivities.map((activity, index) => (
								<div
									key={activity.id}
									className="flex items-center justify-between rounded-lg border p-3"
								>
									<div>
										<div className="flex items-center gap-2">
											<span className="bg-muted text-muted-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs">
												{index + 1}
											</span>
											<p className="text-sm font-medium">
												{activity.client?.name ?? "Unknown Client"}
											</p>
										</div>
										<p className="text-muted-foreground ml-7 text-xs">
											{dayjs.utc(activity.startTime).format("H:mm")} -{" "}
											{dayjs.utc(activity.endTime).format("H:mm")}
										</p>
									</div>
									{sortedActivities.length > 2 && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveActivity(activity.id)}
											disabled={removeActivityMutation.isPending}
										>
											<Trash2 className="h-4 w-4 text-red-500" />
										</Button>
									)}
								</div>
							))}
						</div>
					</div>

					{sortedActivities.length >= 2 && (
						<div>
							<Label className="text-sm font-medium">
								Inter-client transit
							</Label>
							<p className="text-muted-foreground mb-3 text-xs">
								Update the distance and travel time between each client.
							</p>

							<div className="space-y-4">
								{sortedActivities.slice(0, -1).map((from, index) => {
									const to = sortedActivities[index + 1];
									const values = interClientValues[index];
									const gapWarning = getGapWarning(from, to);
									const durationWarning =
										values && getDurationWarning(values.duration);

									return (
										<div
											key={`${from.id}-${to.id}`}
											className="rounded-lg border p-4"
										>
											<div className="mb-3 flex items-center gap-2 text-sm">
												<span className="font-medium">
													{from.client?.name ?? "Unknown"}
												</span>
												<ArrowRight className="h-4 w-4" />
												<span className="font-medium">
													{to.client?.name ?? "Unknown"}
												</span>
											</div>

											{gapWarning && (
												<div className="mb-3 flex items-center gap-2 text-amber-600">
													<AlertTriangle className="h-4 w-4" />
													<span className="text-xs">{gapWarning}</span>
												</div>
											)}

											<div className="grid grid-cols-2 gap-3">
												<div>
													<Label
														htmlFor={`distance-${index}`}
														className="text-xs"
													>
														Distance (km)
													</Label>
													<Input
														id={`distance-${index}`}
														type="number"
														step="0.1"
														min="0"
														placeholder="0"
														value={values?.distance ?? ""}
														onChange={(e) =>
															updateInterClientValue(
																index,
																"distance",
																e.target.value
															)
														}
													/>
												</div>
												<div>
													<Label
														htmlFor={`duration-${index}`}
														className="text-xs"
													>
														Time (min)
													</Label>
													<Input
														id={`duration-${index}`}
														type="number"
														min="0"
														placeholder="0"
														value={values?.duration ?? ""}
														onChange={(e) =>
															updateInterClientValue(
																index,
																"duration",
																e.target.value
															)
														}
														className={cn(
															durationWarning && "border-amber-500"
														)}
													/>
													{durationWarning && (
														<p className="mt-1 text-xs text-amber-600">
															Will be capped at {MAX_DURATION} min
														</p>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{transitSummary && (
						<div className="bg-muted/50 rounded-lg p-4">
							<Label className="text-sm font-medium">Transit Summary</Label>
							<div className="mt-2 grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center gap-2">
									<Car className="text-muted-foreground h-4 w-4" />
									<span>
										{transitSummary.totalDistance.toFixed(1)} km total
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Clock className="text-muted-foreground h-4 w-4" />
									<span>{transitSummary.totalTime} min total</span>
								</div>
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button
						variant="destructive"
						onClick={handleDeleteTrip}
						disabled={deleteTripMutation.isPending}
						className="sm:mr-auto"
					>
						{deleteTripMutation.isPending ? "Deleting..." : "Delete Trip"}
					</Button>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!canSave || updateTripMutation.isPending}
					>
						{updateTripMutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TripEditModal;
