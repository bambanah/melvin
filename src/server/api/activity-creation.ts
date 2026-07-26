// The one path that creates a batch of Activities and assembles them into a
// Trip. Both the manual multi-activity form (`activity.bulkAdd`) and Log
// Promotion (`log.promoteDay`) write through here, so the Activities, the
// Trip, its inter-client legs, and the Provider Travel allocated onto each
// Activity are always produced by the same code - no path can leave a Trip in
// the database whose transit was never allocated.
//
// Callers keep the policy that is genuinely theirs: which Activities exist,
// which of them carry the day's travel, and where the inter-client legs come
// from - a manually entered day derives them from each Client's stored
// distance, Promotion bills the distances captured in the field. Everything
// downstream of those choices is shared.
import { Prisma, type ActivityTransportType } from "@/generated/client";
import {
	standaloneTransitUpdates,
	tripTransitUpdates,
	type InterClientLeg
} from "@/lib/trip-utils";
import { applyTransitUpdates } from "@/server/api/transit";

/** Anything Prisma accepts for a Decimal column. */
type DecimalInput = number | string | Prisma.Decimal;

export interface ActivityDraft {
	clientId: string;
	supportItemId: string;
	date: Date;
	startTime?: Date;
	endTime?: Date;
	/** Set on a group Activity - the rate divides by the participant count. */
	groupSize?: number;
	transitDistance?: DecimalInput;
	transitDuration?: DecimalInput;
	transportItems?: {
		type: ActivityTransportType;
		amount: DecimalInput;
		note?: string | null;
	}[];
}

// Everything trip-utils' allocation reads, plus the transport items callers
// echo back to their own callers.
const createdActivityArgs = {
	include: {
		transportItems: true,
		client: {
			select: {
				distanceToClient: true,
				travelTimeToClient: true,
				transitRatePerKm: true
			}
		}
	}
} satisfies { include: Prisma.ActivityInclude };

export type CreatedActivity = Prisma.ActivityGetPayload<
	typeof createdActivityArgs
>;

/**
 * How a batch's Provider Travel is handled once its Activities exist.
 * `activities` are the ones that carry it - a group Session's mirrored
 * Activities are left out, because travel bills once - and `legs` are the
 * inter-client drives between them. Two or more travel-carrying Activities
 * assemble a Trip; a lone one bills its home legs standalone.
 */
export interface TravelPlan {
	activities: CreatedActivity[];
	legs: InterClientLeg[];
}

/**
 * Create `drafts` as Activities, then hand them to `planTravel` to decide the
 * Trip and the transit allocation. Returning `null` from `planTravel` leaves
 * every Activity's transit exactly as it was created - for a caller whose
 * transit was entered by hand rather than derived.
 *
 * Runs entirely inside the caller's transaction: a batch either lands whole,
 * with its Trip and allocated travel, or not at all.
 */
export async function createActivityBatch(
	tx: Prisma.TransactionClient,
	ownerId: string,
	drafts: ActivityDraft[],
	planTravel: (created: CreatedActivity[]) => TravelPlan | null
): Promise<{ activities: CreatedActivity[]; tripId: string | null }> {
	const activities: CreatedActivity[] = [];
	for (const draft of drafts) {
		// Written field by field rather than spread: a draft is built from user
		// input, and the columns a batch create may set are this list only.
		activities.push(
			await tx.activity.create({
				data: {
					ownerId,
					clientId: draft.clientId,
					supportItemId: draft.supportItemId,
					date: draft.date,
					startTime: draft.startTime,
					endTime: draft.endTime,
					groupSize: draft.groupSize,
					transitDistance: draft.transitDistance,
					transitDuration: draft.transitDuration,
					transportItems:
						draft.transportItems && draft.transportItems.length > 0
							? {
									create: draft.transportItems.map((item) => ({
										type: item.type,
										amount: item.amount,
										note: item.note
									}))
								}
							: undefined
				},
				...createdActivityArgs
			})
		);
	}

	const plan = planTravel(activities);
	if (!plan) return { activities, tripId: null };

	// A day with two or more travel-carrying Activities is a Trip - even with no
	// inter-client legs, since the home legs at either end still bill as one
	// day's Provider Travel.
	const isTrip = plan.activities.length >= 2;

	let tripId: string | null = null;
	if (isTrip) {
		const trip = await tx.trip.create({
			data: {
				date: plan.activities[0].date,
				ownerId,
				activities: {
					connect: plan.activities.map((activity) => ({ id: activity.id }))
				},
				interClientLegs: { create: plan.legs }
			}
		});
		tripId = trip.id;
	}

	const updates = isTrip
		? tripTransitUpdates(plan.activities, plan.legs)
		: standaloneTransitUpdates(plan.activities);
	await applyTransitUpdates(tx, updates);

	// Keep the returned rows honest: they were read before the allocation wrote
	// their transit, so fold the applied values back in.
	const applied = new Map(updates.map((update) => [update.activityId, update]));
	return {
		activities: activities.map((activity) => {
			const update = applied.get(activity.id);
			if (!update) return activity;
			return {
				...activity,
				transitDistance: new Prisma.Decimal(update.transitDistance),
				transitDuration: new Prisma.Decimal(update.transitDuration)
			};
		}),
		tripId
	};
}
