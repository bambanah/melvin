import type { Prisma } from "@/generated/client";

export const MAX_TRANSIT_DURATION_MINUTES = 30;

export interface TripActivity {
	id: string;
	startTime: Date | null;
	endTime: Date | null;
	transitDistance: Prisma.Decimal | null;
	transitDuration: Prisma.Decimal | null;
	client: {
		distanceToClient: Prisma.Decimal | null;
		travelTimeToClient: Prisma.Decimal | null;
		transitRatePerKm: Prisma.Decimal | null;
	} | null;
}

export interface InterClientLeg {
	fromActivityId: string;
	toActivityId: string;
	distance: number | Prisma.Decimal;
	duration: number | Prisma.Decimal;
}

export interface TransitValues {
	transitDistance: number;
	transitDuration: number;
	durationCapped: boolean;
}

export function sortActivitiesByTime<T extends { startTime: Date | null }>(
	activities: T[]
): T[] {
	return [...activities].sort((a, b) => {
		if (!a.startTime) return 1;
		if (!b.startTime) return -1;
		return a.startTime.getTime() - b.startTime.getTime();
	});
}

export function calculateTripTransit(
	activities: TripActivity[],
	interClientLegs: InterClientLeg[]
): Map<string, TransitValues> {
	const sorted = sortActivitiesByTime(activities);
	const result = new Map<string, TransitValues>();

	if (sorted.length === 0) return result;

	const legsMap = new Map<string, InterClientLeg>();
	for (const leg of interClientLegs) {
		legsMap.set(`${leg.fromActivityId}->${leg.toActivityId}`, leg);
	}

	sorted.forEach((activity, index) => {
		const isFirst = index === 0;
		const isLast = index === sorted.length - 1;
		const prevActivity = index > 0 ? sorted[index - 1] : null;

		let transitDistance = 0;
		let transitDuration = 0;
		let durationCapped = false;

		if (isFirst) {
			transitDistance = Number(activity.client?.distanceToClient ?? 0);
			const rawDuration = Number(activity.client?.travelTimeToClient ?? 0);
			if (rawDuration > MAX_TRANSIT_DURATION_MINUTES) {
				durationCapped = true;
				transitDuration = MAX_TRANSIT_DURATION_MINUTES;
			} else {
				transitDuration = rawDuration;
			}
		} else if (prevActivity) {
			const leg = legsMap.get(`${prevActivity.id}->${activity.id}`);
			if (leg) {
				transitDistance = Number(leg.distance);
				const rawDuration = Number(leg.duration);
				if (rawDuration > MAX_TRANSIT_DURATION_MINUTES) {
					durationCapped = true;
					transitDuration = MAX_TRANSIT_DURATION_MINUTES;
				} else {
					transitDuration = rawDuration;
				}
			}
		}

		if (isLast && sorted.length > 1) {
			transitDistance += Number(activity.client?.distanceToClient ?? 0);
			const rawReturnDuration = Number(
				activity.client?.travelTimeToClient ?? 0
			);
			if (rawReturnDuration > MAX_TRANSIT_DURATION_MINUTES) {
				durationCapped = true;
				transitDuration += MAX_TRANSIT_DURATION_MINUTES;
			} else {
				transitDuration += rawReturnDuration;
			}
		}

		result.set(activity.id, {
			transitDistance,
			transitDuration,
			durationCapped
		});
	});

	return result;
}

export function standaloneTransit(
	client: {
		distanceToClient: Prisma.Decimal | null;
		travelTimeToClient: Prisma.Decimal | null;
	} | null
): TransitValues {
	const rawDuration = Number(client?.travelTimeToClient ?? 0);
	const durationCapped = rawDuration > MAX_TRANSIT_DURATION_MINUTES;
	const cappedDuration = Math.min(rawDuration, MAX_TRANSIT_DURATION_MINUTES);

	return {
		transitDistance: Number(client?.distanceToClient ?? 0) * 2,
		transitDuration: cappedDuration * 2,
		durationCapped
	};
}

export interface TransitUpdate {
	activityId: string;
	transitDistance: number;
	transitDuration: number;
}

export function tripTransitUpdates(
	activities: TripActivity[],
	legs: InterClientLeg[]
): TransitUpdate[] {
	const transit = calculateTripTransit(activities, legs);

	return activities.map((activity) => {
		const values = transit.get(activity.id);
		return {
			activityId: activity.id,
			transitDistance: values?.transitDistance ?? 0,
			transitDuration: values?.transitDuration ?? 0
		};
	});
}

export function standaloneTransitUpdates(
	activities: TripActivity[]
): TransitUpdate[] {
	return activities.map((activity) => {
		const values = standaloneTransit(activity.client);
		return {
			activityId: activity.id,
			transitDistance: values.transitDistance,
			transitDuration: values.transitDuration
		};
	});
}
