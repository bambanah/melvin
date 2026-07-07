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
import {
	MAX_TRANSIT_DURATION_MINUTES,
	calculateTripTransit,
	sortActivitiesByTime,
	standaloneTransit,
	type InterClientLeg
} from "@/lib/trip-utils";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
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

type Props =
	| {
			mode: "create";
			date: Date;
			activities: ActivityByDateRangeOutput;
			open: boolean;
			onOpenChange: (open: boolean) => void;
			onSuccess: () => void;
	  }
	| {
			mode: "edit";
			trip: Trip;
			open: boolean;
			onOpenChange: (open: boolean) => void;
			onSuccess: () => void;
	  };

interface InterClientValues {
	fromId: string;
	toId: string;
	distance: string;
	duration: string;
	isPrefilled?: boolean;
}

const getGapWarning = (
	from: { endTime: Date | null },
	to: { startTime: Date | null }
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
	return !isNaN(num) && num > MAX_TRANSIT_DURATION_MINUTES;
};

const TripEditorModal = (props: Props) => {
	const { open, onOpenChange, onSuccess } = props;

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [interClientValues, setInterClientValues] = useState<
		InterClientValues[]
	>([]);

	const createTripMutation = trpc.trip.create.useMutation();
	const updateTripMutation = trpc.trip.update.useMutation();
	const deleteTripMutation = trpc.trip.delete.useMutation();
	const removeActivityMutation = trpc.trip.removeActivity.useMutation();

	const eligibleActivities =
		props.mode === "create"
			? props.activities.filter((a) => a.startTime && a.endTime && !a.tripId)
			: [];

	const hasInvoicedActivities =
		props.mode === "edit" &&
		props.trip.activities.some((a) => {
			const activity = a as { invoiceId?: string | null };
			return activity.invoiceId != null;
		});

	const sortedActivities = useMemo(() => {
		if (props.mode === "create") {
			const eligible = props.activities.filter(
				(a) => a.startTime && a.endTime && !a.tripId
			);
			return sortActivitiesByTime(
				eligible.filter((a) => selectedIds.has(a.id))
			);
		}
		return sortActivitiesByTime(props.trip.activities);
	}, [props, selectedIds]);

	useEffect(() => {
		if (props.mode === "create") {
			if (sortedActivities.length < 2) {
				setInterClientValues([]);
				return;
			}

			setInterClientValues((current) => {
				const next: InterClientValues[] = [];
				for (let i = 0; i < sortedActivities.length - 1; i++) {
					const from = sortedActivities[i];
					const to = sortedActivities[i + 1];

					const existing = current.find(
						(v) => v.fromId === from.id && v.toId === to.id
					);

					next.push(
						existing ?? {
							fromId: from.id,
							toId: to.id,
							distance: "",
							duration: ""
						}
					);
				}
				return next;
			});
			return;
		}

		if (!open) return;

		const trip = props.trip;
		startTransition(() => {
			const next: InterClientValues[] = [];
			for (let i = 0; i < sortedActivities.length - 1; i++) {
				const from = sortedActivities[i];
				const to = sortedActivities[i + 1];

				const existingLeg = trip.interClientLegs.find(
					(leg) => leg.fromActivityId === from.id && leg.toActivityId === to.id
				);

				next.push({
					fromId: from.id,
					toId: to.id,
					distance: existingLeg ? String(existingLeg.distance) : "",
					duration: existingLeg ? String(existingLeg.duration) : ""
				});
			}
			setInterClientValues(next);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props, open, selectedIds, sortedActivities.length]);

	const toggleActivity = (id: string) => {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setSelectedIds(newSet);
	};

	const updateInterClientValue = (
		index: number,
		field: "distance" | "duration",
		value: string
	) => {
		if (props.mode !== "create") {
			setInterClientValues((current) => {
				const next = [...current];
				next[index] = { ...next[index], [field]: value };
				return next;
			});
			return;
		}

		setInterClientValues((current) => {
			const next = [...current];
			next[index] = { ...next[index], [field]: value, isPrefilled: false };

			const fromClientId = sortedActivities[index]?.client?.id;
			const toClientId = sortedActivities[index + 1]?.client?.id;

			if (fromClientId && toClientId && value) {
				for (let i = 0; i < next.length; i++) {
					if (i === index) continue;
					const otherFromClientId = sortedActivities[i]?.client?.id;
					const otherToClientId = sortedActivities[i + 1]?.client?.id;
					if (
						otherFromClientId === toClientId &&
						otherToClientId === fromClientId &&
						!next[i][field]
					) {
						next[i] = { ...next[i], [field]: value, isPrefilled: true };
					}
				}
			}

			return next;
		});
	};

	const transitSummary = useMemo(() => {
		if (sortedActivities.length < 2) return null;

		const legs: InterClientLeg[] = interClientValues.map((v) => ({
			fromActivityId: v.fromId,
			toActivityId: v.toId,
			distance: parseFloat(v.distance) || 0,
			duration: Math.min(
				parseFloat(v.duration) || 0,
				MAX_TRANSIT_DURATION_MINUTES
			)
		}));

		const transit = calculateTripTransit(sortedActivities, legs);
		let totalDistance = 0;
		let totalTime = 0;
		for (const values of transit.values()) {
			totalDistance += values.transitDistance;
			totalTime += values.transitDuration;
		}

		if (props.mode === "edit") {
			return { totalDistance, totalTime, distanceSaved: null, timeSaved: null };
		}

		const standaloneTotals = sortedActivities.reduce(
			(acc, activity) => {
				const values = standaloneTransit(activity.client);
				return {
					distance: acc.distance + values.transitDistance,
					time: acc.time + values.transitDuration
				};
			},
			{ distance: 0, time: 0 }
		);

		return {
			totalDistance,
			totalTime,
			distanceSaved: standaloneTotals.distance - totalDistance,
			timeSaved: standaloneTotals.time - totalTime
		};
	}, [sortedActivities, interClientValues, props.mode]);

	const canSubmit =
		(props.mode === "create" ? selectedIds.size >= 2 : true) &&
		interClientValues.every((v) => v.distance && v.duration);

	const handleSubmit = async () => {
		if (!canSubmit) return;

		const interClientLegs = interClientValues.map((v) => ({
			fromActivityId: v.fromId,
			toActivityId: v.toId,
			distance: parseFloat(v.distance),
			duration: Math.min(parseFloat(v.duration), MAX_TRANSIT_DURATION_MINUTES)
		}));

		if (props.mode === "create") {
			try {
				await createTripMutation.mutateAsync({
					date: props.date,
					activityIds: Array.from(selectedIds),
					interClientLegs
				});

				toast.success("Back-to-back trip created");
				setSelectedIds(new Set());
				setInterClientValues([]);
				onSuccess();
				onOpenChange(false);
			} catch {
				toast.error("Failed to create trip");
			}
			return;
		}

		try {
			await updateTripMutation.mutateAsync({
				tripId: props.trip.id,
				interClientLegs
			});

			toast.success("Trip updated");
			onSuccess();
			onOpenChange(false);
		} catch {
			toast.error("Failed to update trip");
		}
	};

	const handleRemoveActivity = async (activityId: string) => {
		if (props.mode !== "edit") return;

		try {
			const result = await removeActivityMutation.mutateAsync({
				tripId: props.trip.id,
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
		if (props.mode !== "edit") return;

		try {
			await deleteTripMutation.mutateAsync({ tripId: props.trip.id });
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
						{props.mode === "create"
							? "Create Back-to-Back Trip"
							: "Edit Back-to-Back Trip"}
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
					{props.mode === "create" ? (
						<div>
							<Label className="text-sm font-medium">
								Select activities to link
							</Label>
							<p className="text-muted-foreground mb-3 text-xs">
								Select 2 or more activities with times to create a back-to-back
								trip.
							</p>

							<div className="space-y-2">
								{eligibleActivities.length === 0 ? (
									<p className="text-muted-foreground py-4 text-center text-sm">
										No eligible activities. Activities must have start/end times
										and not be in another trip.
									</p>
								) : (
									eligibleActivities.map((activity) => (
										<button
											key={activity.id}
											type="button"
											onClick={() => toggleActivity(activity.id)}
											className={cn(
												"flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
												selectedIds.has(activity.id)
													? "border-primary bg-primary/5"
													: "hover:bg-muted/50"
											)}
										>
											<div>
												<p className="text-sm font-medium">
													{activity.client?.name ?? "Unknown Client"}
												</p>
												<p className="text-muted-foreground text-xs">
													{dayjs.utc(activity.startTime).format("H:mm")} -{" "}
													{dayjs.utc(activity.endTime).format("H:mm")}
												</p>
											</div>
											{selectedIds.has(activity.id) && (
												<span className="text-primary text-xs font-medium">
													Selected
												</span>
											)}
										</button>
									))
								)}
							</div>
						</div>
					) : (
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
					)}

					{sortedActivities.length >= 2 && (
						<div>
							<Label className="text-sm font-medium">
								Inter-client transit
							</Label>
							<p className="text-muted-foreground mb-3 text-xs">
								{props.mode === "create"
									? "Enter the distance and travel time between each client."
									: "Update the distance and travel time between each client."}
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
														className={cn(
															values?.isPrefilled &&
																values?.distance &&
																"text-muted-foreground italic"
														)}
													/>
													{values?.isPrefilled && values?.distance && (
														<p className="text-muted-foreground mt-1 text-xs">
															Auto-filled from reverse
														</p>
													)}
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
															durationWarning && "border-amber-500",
															values?.isPrefilled &&
																values?.duration &&
																"text-muted-foreground italic"
														)}
													/>
													{durationWarning && (
														<p className="mt-1 text-xs text-amber-600">
															Will be capped at {MAX_TRANSIT_DURATION_MINUTES}{" "}
															min
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

					{transitSummary && (props.mode === "edit" || canSubmit) && (
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
							{transitSummary.distanceSaved !== null &&
								transitSummary.distanceSaved > 0 && (
									<p className="mt-2 text-xs text-green-600">
										Saves {transitSummary.distanceSaved.toFixed(1)} km and{" "}
										{transitSummary.timeSaved} min vs separate trips
									</p>
								)}
						</div>
					)}
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					{props.mode === "edit" && (
						<Button
							variant="destructive"
							onClick={handleDeleteTrip}
							disabled={deleteTripMutation.isPending}
							className="sm:mr-auto"
						>
							{deleteTripMutation.isPending ? "Deleting..." : "Delete Trip"}
						</Button>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={
							!canSubmit ||
							createTripMutation.isPending ||
							updateTripMutation.isPending
						}
					>
						{props.mode === "create"
							? createTripMutation.isPending
								? "Creating..."
								: "Create Trip"
							: updateTripMutation.isPending
								? "Saving..."
								: "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TripEditorModal;
