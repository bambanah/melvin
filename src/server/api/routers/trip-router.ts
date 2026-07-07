import {
	standaloneTransitUpdates,
	tripTransitUpdates,
	type TransitUpdate
} from "@/lib/trip-utils";
import { authedProcedure, router } from "@/server/api/trpc";
import type { Prisma } from "@/generated/client";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

const interClientLegSchema = z.object({
	fromActivityId: z.string(),
	toActivityId: z.string(),
	distance: z.number().min(0),
	duration: z.number().min(0)
});

const tripActivitySelect = {
	id: true,
	startTime: true,
	endTime: true,
	transitDistance: true,
	transitDuration: true,
	date: true,
	tripId: true,
	client: {
		select: {
			id: true,
			name: true,
			distanceToClient: true,
			travelTimeToClient: true,
			transitRatePerKm: true
		}
	},
	supportItem: {
		select: {
			isGroup: true
		}
	}
};

async function applyTransitUpdates(
	tx: Prisma.TransactionClient,
	updates: TransitUpdate[]
) {
	for (const update of updates) {
		await tx.activity.update({
			where: { id: update.activityId },
			data: {
				transitDistance: update.transitDistance,
				transitDuration: update.transitDuration
			}
		});
	}
}

export const tripRouter = router({
	create: authedProcedure
		.input(
			z.object({
				date: z.date(),
				activityIds: z.array(z.string()).min(2),
				interClientLegs: z.array(interClientLegSchema)
			})
		)
		.mutation(async ({ ctx, input }) => {
			const activities = await ctx.prisma.activity.findMany({
				where: {
					id: { in: input.activityIds },
					ownerId: ctx.session.user.id
				},
				select: tripActivitySelect
			});

			if (activities.length !== input.activityIds.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "One or more activities not found"
				});
			}

			if (activities.some((a) => a.tripId)) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "One or more activities are already in a trip"
				});
			}

			await ctx.owned.activity.assertNoneOnLockedInvoice(input.activityIds);

			const updates = tripTransitUpdates(activities, input.interClientLegs);

			return ctx.prisma.$transaction(async (tx) => {
				const trip = await tx.trip.create({
					data: {
						date: input.date,
						ownerId: ctx.session.user.id,
						activities: {
							connect: input.activityIds.map((id) => ({ id }))
						},
						interClientLegs: {
							create: input.interClientLegs.map((leg) => ({
								fromActivityId: leg.fromActivityId,
								toActivityId: leg.toActivityId,
								distance: leg.distance,
								duration: leg.duration
							}))
						}
					},
					include: {
						activities: {
							select: tripActivitySelect
						},
						interClientLegs: true
					}
				});

				await applyTransitUpdates(tx, updates);

				return trip;
			});
		}),

	addActivity: authedProcedure
		.input(
			z.object({
				tripId: z.string(),
				activityId: z.string(),
				interClientLegs: z.array(interClientLegSchema)
			})
		)
		.mutation(async ({ ctx, input }) => {
			const trip = await ctx.prisma.trip.findFirst({
				where: {
					id: input.tripId,
					ownerId: ctx.session.user.id
				},
				include: {
					activities: { select: tripActivitySelect },
					interClientLegs: true
				}
			});

			if (!trip) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const activity = await ctx.prisma.activity.findFirst({
				where: {
					id: input.activityId,
					ownerId: ctx.session.user.id,
					tripId: null
				},
				select: tripActivitySelect
			});

			if (!activity) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Activity not found or already in a trip"
				});
			}

			await ctx.owned.activity.assertNoneOnLockedInvoice([
				...trip.activities.map((a) => a.id),
				activity.id
			]);

			const allActivities = [...trip.activities, activity];
			const allLegs = [...trip.interClientLegs, ...input.interClientLegs];
			const updates = tripTransitUpdates(allActivities, allLegs);

			await ctx.prisma.$transaction(async (tx) => {
				await tx.activity.update({
					where: { id: input.activityId },
					data: { tripId: input.tripId }
				});

				for (const leg of input.interClientLegs) {
					await tx.interClientLeg.create({
						data: {
							tripId: input.tripId,
							fromActivityId: leg.fromActivityId,
							toActivityId: leg.toActivityId,
							distance: leg.distance,
							duration: leg.duration
						}
					});
				}

				await applyTransitUpdates(tx, updates);
			});

			return ctx.prisma.trip.findFirst({
				where: { id: input.tripId },
				include: {
					activities: { select: tripActivitySelect },
					interClientLegs: true
				}
			});
		}),

	removeActivity: authedProcedure
		.input(
			z.object({
				tripId: z.string(),
				activityId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const trip = await ctx.prisma.trip.findFirst({
				where: {
					id: input.tripId,
					ownerId: ctx.session.user.id
				},
				include: {
					activities: { select: tripActivitySelect },
					interClientLegs: true
				}
			});

			if (!trip) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const activityToRemove = trip.activities.find(
				(a) => a.id === input.activityId
			);
			if (!activityToRemove) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Activity not in trip"
				});
			}

			await ctx.owned.activity.assertNoneOnLockedInvoice(
				trip.activities.map((a) => a.id)
			);

			const remainingActivities = trip.activities.filter(
				(a) => a.id !== input.activityId
			);

			if (remainingActivities.length < 2) {
				const updates = standaloneTransitUpdates(trip.activities);

				await ctx.prisma.$transaction(async (tx) => {
					await tx.interClientLeg.deleteMany({
						where: { tripId: input.tripId }
					});

					for (const act of trip.activities) {
						await tx.activity.update({
							where: { id: act.id },
							data: { tripId: null }
						});
					}

					await applyTransitUpdates(tx, updates);

					await tx.trip.delete({
						where: { id: input.tripId }
					});
				});

				return { dissolved: true };
			}

			const standaloneUpdates = standaloneTransitUpdates([activityToRemove]);
			const remainingUpdates = tripTransitUpdates(
				remainingActivities,
				trip.interClientLegs.filter(
					(leg) =>
						leg.fromActivityId !== input.activityId &&
						leg.toActivityId !== input.activityId
				)
			);

			await ctx.prisma.$transaction(async (tx) => {
				await tx.interClientLeg.deleteMany({
					where: {
						tripId: input.tripId,
						OR: [
							{ fromActivityId: input.activityId },
							{ toActivityId: input.activityId }
						]
					}
				});

				await tx.activity.update({
					where: { id: input.activityId },
					data: { tripId: null }
				});

				await applyTransitUpdates(tx, [
					...standaloneUpdates,
					...remainingUpdates
				]);
			});

			return {
				dissolved: false,
				trip: await ctx.prisma.trip.findFirst({
					where: { id: input.tripId },
					include: {
						activities: { select: tripActivitySelect },
						interClientLegs: true
					}
				})
			};
		}),

	update: authedProcedure
		.input(
			z.object({
				tripId: z.string(),
				interClientLegs: z.array(
					z.object({
						id: z.string().optional(),
						fromActivityId: z.string(),
						toActivityId: z.string(),
						distance: z.number().min(0),
						duration: z.number().min(0)
					})
				)
			})
		)
		.mutation(async ({ ctx, input }) => {
			const trip = await ctx.prisma.trip.findFirst({
				where: {
					id: input.tripId,
					ownerId: ctx.session.user.id
				},
				include: {
					activities: { select: tripActivitySelect },
					interClientLegs: true
				}
			});

			if (!trip) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			await ctx.owned.activity.assertNoneOnLockedInvoice(
				trip.activities.map((a) => a.id)
			);

			const updates = tripTransitUpdates(
				trip.activities,
				input.interClientLegs
			);

			await ctx.prisma.$transaction(async (tx) => {
				await tx.interClientLeg.deleteMany({
					where: { tripId: input.tripId }
				});

				await tx.interClientLeg.createMany({
					data: input.interClientLegs.map((leg) => ({
						tripId: input.tripId,
						fromActivityId: leg.fromActivityId,
						toActivityId: leg.toActivityId,
						distance: leg.distance,
						duration: leg.duration
					}))
				});

				await applyTransitUpdates(tx, updates);
			});

			return ctx.prisma.trip.findFirst({
				where: { id: input.tripId },
				include: {
					activities: { select: tripActivitySelect },
					interClientLegs: true
				}
			});
		}),

	delete: authedProcedure
		.input(z.object({ tripId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const trip = await ctx.prisma.trip.findFirst({
				where: {
					id: input.tripId,
					ownerId: ctx.session.user.id
				},
				include: {
					activities: { select: tripActivitySelect }
				}
			});

			if (!trip) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			await ctx.owned.activity.assertNoneOnLockedInvoice(
				trip.activities.map((a) => a.id)
			);

			const updates = standaloneTransitUpdates(trip.activities);

			await ctx.prisma.$transaction(async (tx) => {
				for (const activity of trip.activities) {
					await tx.activity.update({
						where: { id: activity.id },
						data: { tripId: null }
					});
				}

				await applyTransitUpdates(tx, updates);

				await tx.trip.delete({
					where: { id: input.tripId }
				});
			});

			return { success: true };
		}),

	getByDate: authedProcedure
		.input(z.object({ date: z.date() }))
		.query(async ({ ctx, input }) => {
			const trip = await ctx.prisma.trip.findFirst({
				where: {
					ownerId: ctx.session.user.id,
					date: input.date
				},
				include: {
					activities: {
						select: tripActivitySelect,
						orderBy: { startTime: "asc" }
					},
					interClientLegs: true
				}
			});

			return trip;
		}),

	suggestForDate: authedProcedure
		.input(z.object({ date: z.date() }))
		.query(async ({ ctx, input }) => {
			const activities = await ctx.prisma.activity.findMany({
				where: {
					ownerId: ctx.session.user.id,
					date: input.date,
					tripId: null,
					startTime: { not: null },
					endTime: { not: null }
				},
				select: tripActivitySelect,
				orderBy: { startTime: "asc" }
			});

			return activities;
		})
});

export type TripRouterOutput = inferRouterOutputs<typeof tripRouter>;
