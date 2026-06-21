import { calculateTripTransit } from "@/lib/trip-utils";
import { authedProcedure, router } from "@/server/api/trpc";
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

			const existingTrip = activities.find((a) => {
				const activityAny = a as { tripId?: string };
				return activityAny.tripId;
			});
			if (existingTrip) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "One or more activities are already in a trip"
				});
			}

			const transit = calculateTripTransit(activities, input.interClientLegs);

			const trip = await ctx.prisma.trip.create({
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

			for (const activity of trip.activities) {
				const values = transit.get(activity.id);
				if (values) {
					await ctx.prisma.activity.update({
						where: { id: activity.id },
						data: {
							transitDistance: values.transitDistance,
							transitDuration: values.transitDuration
						}
					});
				}
			}

			return trip;
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

			const allActivities = [...trip.activities, activity];
			const allLegs = [...trip.interClientLegs, ...input.interClientLegs];
			const transit = calculateTripTransit(allActivities, allLegs);

			await ctx.prisma.activity.update({
				where: { id: input.activityId },
				data: { tripId: input.tripId }
			});

			for (const leg of input.interClientLegs) {
				await ctx.prisma.interClientLeg.create({
					data: {
						tripId: input.tripId,
						fromActivityId: leg.fromActivityId,
						toActivityId: leg.toActivityId,
						distance: leg.distance,
						duration: leg.duration
					}
				});
			}

			for (const act of allActivities) {
				const values = transit.get(act.id);
				if (values) {
					await ctx.prisma.activity.update({
						where: { id: act.id },
						data: {
							transitDistance: values.transitDistance,
							transitDuration: values.transitDuration
						}
					});
				}
			}

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

			const remainingActivities = trip.activities.filter(
				(a) => a.id !== input.activityId
			);

			if (remainingActivities.length < 2) {
				await ctx.prisma.interClientLeg.deleteMany({
					where: { tripId: input.tripId }
				});

				for (const act of trip.activities) {
					const distance = Number(act.client?.distanceToClient ?? 0) * 2;
					const duration = Number(act.client?.travelTimeToClient ?? 0) * 2;
					await ctx.prisma.activity.update({
						where: { id: act.id },
						data: {
							tripId: null,
							transitDistance: distance,
							transitDuration: duration
						}
					});
				}

				await ctx.prisma.trip.delete({
					where: { id: input.tripId }
				});

				return { dissolved: true };
			}

			await ctx.prisma.interClientLeg.deleteMany({
				where: {
					tripId: input.tripId,
					OR: [
						{ fromActivityId: input.activityId },
						{ toActivityId: input.activityId }
					]
				}
			});

			const standaloneDistance =
				Number(activityToRemove.client?.distanceToClient ?? 0) * 2;
			const standaloneDuration =
				Number(activityToRemove.client?.travelTimeToClient ?? 0) * 2;

			await ctx.prisma.activity.update({
				where: { id: input.activityId },
				data: {
					tripId: null,
					transitDistance: standaloneDistance,
					transitDuration: standaloneDuration
				}
			});

			const remainingLegs = await ctx.prisma.interClientLeg.findMany({
				where: { tripId: input.tripId }
			});

			const transit = calculateTripTransit(remainingActivities, remainingLegs);

			for (const act of remainingActivities) {
				const values = transit.get(act.id);
				if (values) {
					await ctx.prisma.activity.update({
						where: { id: act.id },
						data: {
							transitDistance: values.transitDistance,
							transitDuration: values.transitDuration
						}
					});
				}
			}

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

			await ctx.prisma.interClientLeg.deleteMany({
				where: { tripId: input.tripId }
			});

			await ctx.prisma.interClientLeg.createMany({
				data: input.interClientLegs.map((leg) => ({
					tripId: input.tripId,
					fromActivityId: leg.fromActivityId,
					toActivityId: leg.toActivityId,
					distance: leg.distance,
					duration: leg.duration
				}))
			});

			const transit = calculateTripTransit(
				trip.activities,
				input.interClientLegs
			);

			for (const activity of trip.activities) {
				const values = transit.get(activity.id);
				if (values) {
					await ctx.prisma.activity.update({
						where: { id: activity.id },
						data: {
							transitDistance: values.transitDistance,
							transitDuration: values.transitDuration
						}
					});
				}
			}

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

			for (const activity of trip.activities) {
				const distance = Number(activity.client?.distanceToClient ?? 0) * 2;
				const duration = Number(activity.client?.travelTimeToClient ?? 0) * 2;

				await ctx.prisma.activity.update({
					where: { id: activity.id },
					data: {
						tripId: null,
						transitDistance: distance,
						transitDuration: duration
					}
				});
			}

			await ctx.prisma.trip.delete({
				where: { id: input.tripId }
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
