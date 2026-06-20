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
import type { ActivityByDateRangeOutput } from "@/server/api/routers/activity-router";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { AlertTriangle, ArrowRight, Car, Clock, Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

dayjs.extend(utc);

interface Props {
	date: Date;
	activities: ActivityByDateRangeOutput;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

interface InterClientValues {
	fromId: string;
	toId: string;
	distance: string;
	duration: string;
	isPrefilled?: boolean;
}

const MAX_DURATION = 30;

const TripBuilderModal = ({
	date,
	activities,
	open,
	onOpenChange,
	onSuccess
}: Props) => {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [interClientValues, setInterClientValues] = useState<
		InterClientValues[]
	>([]);

	const createTripMutation = trpc.trip.create.useMutation();

	const eligibleActivities = activities.filter(
		(a) => a.startTime && a.endTime && !a.tripId
	);
	const sortedSelected = sortActivitiesByTime(
		eligibleActivities.filter((a) => selectedIds.has(a.id))
	);

	useEffect(() => {
		if (sortedSelected.length < 2) {
			setInterClientValues([]);
			return;
		}

		const newValues: InterClientValues[] = [];
		for (let i = 0; i < sortedSelected.length - 1; i++) {
			const from = sortedSelected[i];
			const to = sortedSelected[i + 1];

			const existing = interClientValues.find(
				(v) => v.fromId === from.id && v.toId === to.id
			);

			if (existing) {
				newValues.push(existing);
			} else {
				newValues.push({
					fromId: from.id,
					toId: to.id,
					distance: "",
					duration: ""
				});
			}
		}
		setInterClientValues(newValues);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedIds, sortedSelected.length]);

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
		const newValues = [...interClientValues];
		const current = newValues[index];
		newValues[index] = { ...current, [field]: value, isPrefilled: false };

		const fromClientId = sortedSelected[index]?.client?.id;
		const toClientId = sortedSelected[index + 1]?.client?.id;

		if (fromClientId && toClientId && value) {
			for (let i = 0; i < newValues.length; i++) {
				if (i === index) continue;
				const otherFromClientId = sortedSelected[i]?.client?.id;
				const otherToClientId = sortedSelected[i + 1]?.client?.id;
				if (
					otherFromClientId === toClientId &&
					otherToClientId === fromClientId &&
					!newValues[i][field]
				) {
					newValues[i] = { ...newValues[i], [field]: value, isPrefilled: true };
				}
			}
		}

		setInterClientValues(newValues);
	};

	const getGapWarning = (
		from: ActivityByDateRangeOutput[number],
		to: ActivityByDateRangeOutput[number]
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
		if (sortedSelected.length < 2) return null;

		const firstActivity = sortedSelected[0];
		const lastActivity = sortedSelected[sortedSelected.length - 1];

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

		const standaloneDistance =
			sortedSelected.reduce(
				(sum, a) => sum + Number(a.client?.distanceToClient ?? 0) * 2,
				0
			);
		const standaloneTime = sortedSelected.reduce(
			(sum, a) =>
				sum + Math.min(Number(a.client?.travelTimeToClient ?? 0), MAX_DURATION) * 2,
			0
		);

		const distanceSaved = standaloneDistance - totalDistance;
		const timeSaved = standaloneTime - totalTime;

		return {
			totalDistance,
			totalTime,
			distanceSaved,
			timeSaved
		};
	}, [sortedSelected, interClientValues]);

	const canCreate =
		selectedIds.size >= 2 &&
		interClientValues.every((v) => v.distance && v.duration);

	const handleCreate = async () => {
		if (!canCreate) return;

		try {
			await createTripMutation.mutateAsync({
				date,
				activityIds: Array.from(selectedIds),
				interClientLegs: interClientValues.map((v) => ({
					fromActivityId: v.fromId,
					toActivityId: v.toId,
					distance: parseFloat(v.distance),
					duration: Math.min(parseFloat(v.duration), MAX_DURATION)
				}))
			});

			toast.success("Back-to-back trip created");
			setSelectedIds(new Set());
			setInterClientValues([]);
			onSuccess();
			onOpenChange(false);
		} catch {
			toast.error("Failed to create trip");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						Create Back-to-Back Trip
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
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

					{sortedSelected.length >= 2 && (
						<div>
							<Label className="text-sm font-medium">
								Inter-client transit
							</Label>
							<p className="text-muted-foreground mb-3 text-xs">
								Enter the distance and travel time between each client.
							</p>

							<div className="space-y-4">
								{sortedSelected.slice(0, -1).map((from, index) => {
									const to = sortedSelected[index + 1];
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
													<Label htmlFor={`distance-${index}`} className="text-xs">
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
													<Label htmlFor={`duration-${index}`} className="text-xs">
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

					{transitSummary && canCreate && (
						<div className="bg-muted/50 rounded-lg p-4">
							<Label className="text-sm font-medium">Transit Summary</Label>
							<div className="mt-2 grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center gap-2">
									<Car className="text-muted-foreground h-4 w-4" />
									<span>{transitSummary.totalDistance.toFixed(1)} km total</span>
								</div>
								<div className="flex items-center gap-2">
									<Clock className="text-muted-foreground h-4 w-4" />
									<span>{transitSummary.totalTime} min total</span>
								</div>
							</div>
							{transitSummary.distanceSaved > 0 && (
								<p className="mt-2 text-xs text-green-600">
									Saves {transitSummary.distanceSaved.toFixed(1)} km and{" "}
									{transitSummary.timeSaved} min vs separate trips
								</p>
							)}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleCreate}
						disabled={!canCreate || createTripMutation.isPending}
					>
						{createTripMutation.isPending ? "Creating..." : "Create Trip"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TripBuilderModal;
