import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { DEFAULT_TRANSIT_RATE } from "@/lib/billing-lines";
import { checkActivityOverlap, formatOverlapError } from "@/lib/overlap-utils";
import { baseListQueryInput } from "@/lib/trpc";
import type { Prisma } from "@/generated/client";
import { activitySchema } from "@/schema/activity-schema";
import {
	createActivityBatch,
	type ActivityDraft
} from "@/server/api/activity-creation";
import { paginate } from "@/server/api/owned";
import { authedProcedure, router } from "@/server/api/trpc";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

import { parseUtcTime, utcDate } from "@/lib/date-utils";
import { format } from "date-fns";
import {
	DEFAULT_LIST_LIMIT,
	DEFAULT_UNBILLED_PAGE_SIZE
} from "./router.constants";

const defaultActivitySelect = {
	id: true,
	startTime: true,
	endTime: true,
	transitDistance: true,
	transitDuration: true,
	itemDistance: true,
	date: true,
	supportItem: true,
	client: true,
	invoice: {
		select: {
			invoiceNo: true,
			id: true
		}
	},
	tripId: true,
	trip: {
		select: {
			id: true,
			date: true
		}
	},
	transportItems: {
		select: {
			id: true,
			type: true,
			amount: true,
			note: true
		}
	}
};

// byId feeds the activity detail / billing-breakdown page, which needs the
// invoice's status and the trip's sibling legs to render the live breakdown
// and trip summary. Kept separate from defaultActivitySelect so list/forInvoice
// payloads stay lean — deliberately do not widen the shared select.
const byIdActivitySelect = {
	...defaultActivitySelect,
	// Without this the page's groupSizeOf falls back to the default group size
	// and renders the wrong apportionment for groups of 3+.
	groupSize: true,
	invoice: {
		select: {
			invoiceNo: true,
			id: true,
			status: true
		}
	},
	trip: {
		select: {
			id: true,
			date: true,
			activities: {
				select: {
					id: true,
					startTime: true,
					endTime: true,
					itemDistance: true,
					transitDistance: true,
					transitDuration: true,
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
							description: true
						}
					}
				}
			},
			interClientLegs: {
				select: {
					fromActivityId: true,
					toActivityId: true,
					distance: true,
					duration: true
				}
			}
		}
	}
};

// "Unbilled" = work that still needs to be invoiced: either never attached to
// an invoice, or attached to a draft still in status CREATED (never-sent drafts
// and re-opened amendments). Sent (SENT) and paid (PAID) work is billed and
// excluded. Deliberately broader than `activity.pending` (unattached only) and
// deliberately NOT changing it — pick-up still means unattached.
const unbilledActivityWhere = {
	OR: [{ invoiceId: null }, { invoice: { status: "CREATED" } }]
} satisfies Prisma.ActivityWhereInput;

// List/summary need groupSize for correct group apportionment and the invoice
// status to badge draft-attached rows, on top of the shared lean select.
const unbilledActivitySelect = {
	...defaultActivitySelect,
	groupSize: true,
	invoiceId: true,
	invoice: {
		select: {
			invoiceNo: true,
			id: true,
			status: true
		}
	}
};

function getInvoiceIdWhereCondition(invoiceIdAssigned?: boolean) {
	if (invoiceIdAssigned === undefined) return;

	return invoiceIdAssigned ? { not: null } : { equals: null };
}

export const activityRouter = router({
	list: authedProcedure
		.input(
			baseListQueryInput.extend({
				assigned: z.boolean().optional(),
				invoiceId: z.string().optional(),
				clientId: z.string().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? DEFAULT_LIST_LIMIT;
			const { assigned, invoiceId, clientId, cursor } = input;

			const { items: activities, nextCursor } = await paginate({
				limit,
				cursor,
				query: ({ take, cursor }) =>
					ctx.owned.activity.findMany({
						select: {
							...defaultActivitySelect,
							invoice: {
								select: { id: true, invoiceNo: true }
							}
						},
						take,
						cursor,
						where: {
							invoiceId: invoiceId ?? getInvoiceIdWhereCondition(assigned),
							clientId
						},
						orderBy: [
							{
								date: "desc"
							},
							{
								startTime: "desc"
							}
						]
					})
			});

			return {
				activities,
				nextCursor
			};
		}),
	// The dashboard "Unbilled" list: all-time, oldest-first, infinite-scrolled.
	unbilledList: authedProcedure
		.input(baseListQueryInput)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? DEFAULT_UNBILLED_PAGE_SIZE;

			const { items: activities, nextCursor } = await paginate({
				limit,
				cursor: input.cursor,
				query: ({ take, cursor }) =>
					ctx.owned.activity.findMany({
						select: unbilledActivitySelect,
						take,
						cursor,
						where: unbilledActivityWhere,
						orderBy: [{ date: "asc" }, { startTime: "asc" }]
					})
			});

			return { activities, nextCursor };
		}),
	// Count + grand total for the whole unbilled set, computed by running every
	// unbilled activity through the single billing path — never summed from the
	// loaded pages, so the header stays correct regardless of how far the user
	// has scrolled.
	unbilledSummary: authedProcedure.query(async ({ ctx }) => {
		const activities = await ctx.owned.activity.findMany({
			select: { ...defaultActivitySelect, groupSize: true },
			where: unbilledActivityWhere
		});

		const user = await ctx.prisma.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { transitRatePerKm: true }
		});

		const rateContext = {
			userTransitRatePerKm: Number(
				user?.transitRatePerKm ?? DEFAULT_TRANSIT_RATE
			)
		};

		const total = getTotalCostOfActivities(activities, rateContext, {
			forDisplay: true
		});

		return { count: activities.length, total };
	}),
	pending: authedProcedure.query(async ({ ctx }) => {
		const activities = await ctx.owned.activity.findMany({
			select: defaultActivitySelect,
			where: {
				invoiceId: null
			}
		});

		const groupedActivities = activities.reduce<
			Record<string, typeof activities>
		>((acc, activity) => {
			const clientName = activity.client?.name;
			if (!clientName) return acc;

			if (!acc[clientName]) {
				acc[clientName] = [];
			}

			// Add the activity to the appropriate group
			acc[clientName].push(activity);

			return acc;
		}, {});

		return groupedActivities;
	}),
	byDateRange: authedProcedure
		.input(
			z.object({
				startDate: z.date(),
				endDate: z.date()
			})
		)
		.query(async ({ ctx, input }) => {
			const activities = await ctx.owned.activity.findMany({
				select: {
					...defaultActivitySelect,
					invoiceId: true
				},
				where: {
					date: {
						gte: input.startDate,
						lt: input.endDate
					}
				},
				orderBy: [{ date: "asc" }, { startTime: "asc" }]
			});

			return activities;
		}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const activity = await ctx.owned.activity.findFirst({
				select: byIdActivitySelect,
				where: {
					id: input.id
				}
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return activity;
		}),
	forInvoice: authedProcedure
		.input(z.object({ invoiceId: z.string() }))
		.query(async ({ input, ctx }) => {
			const activities = await ctx.owned.activity.findMany({
				select: defaultActivitySelect,
				where: {
					invoiceId: input.invoiceId
				}
			});

			return activities.length > 0
				? { activities }
				: new TRPCError({ code: "NOT_FOUND" });
		}),
	add: authedProcedure
		.input(
			z.object({
				activity: activitySchema
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { activity: inputActivity } = input;
			const { transportItems, ...activityData } = inputActivity;

			const startTime = activityData.startTime
				? parseUtcTime(activityData.startTime)
				: undefined;
			const endTime = activityData.endTime
				? parseUtcTime(activityData.endTime)
				: undefined;

			const conflicting = await checkActivityOverlap(ctx.prisma, {
				date: activityData.date,
				startTime,
				endTime,
				ownerId: ctx.session.user.id
			});

			if (conflicting) {
				throw new TRPCError({
					code: "CONFLICT",
					message: formatOverlapError(conflicting)
				});
			}

			await ctx.owned.client.assert(activityData.clientId);
			await ctx.owned.supportItem.assert(activityData.supportItemId);

			const activity = await ctx.prisma.activity.create({
				data: {
					...activityData,
					startTime,
					endTime,
					transitDistance: activityData.transitDistance || undefined,
					transitDuration: activityData.transitDuration || undefined,
					ownerId: ctx.session.user.id,
					transportItems:
						transportItems && transportItems.length > 0
							? {
									create: transportItems.map((item) => ({
										type: item.type,
										amount: item.amount,
										note: item.note
									}))
								}
							: undefined
				},
				include: {
					transportItems: true
				}
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return activity;
		}),
	modify: authedProcedure
		.input(
			z.object({
				id: z.string(),
				activity: activitySchema
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { transportItems, ...activityData } = input.activity;

			const startTime = activityData.startTime
				? parseUtcTime(activityData.startTime)
				: undefined;
			const endTime = activityData.endTime
				? parseUtcTime(activityData.endTime)
				: undefined;

			const conflicting = await checkActivityOverlap(ctx.prisma, {
				date: activityData.date,
				startTime,
				endTime,
				ownerId: ctx.session.user.id,
				excludeActivityId: input.id
			});

			if (conflicting) {
				throw new TRPCError({
					code: "CONFLICT",
					message: formatOverlapError(conflicting)
				});
			}

			await ctx.owned.activity.assert(input.id);
			await ctx.owned.activity.assertNoneOnLockedInvoice([input.id]);
			await ctx.owned.client.assert(activityData.clientId);
			await ctx.owned.supportItem.assert(activityData.supportItemId);

			// Delete existing transport items and recreate
			if (transportItems !== undefined) {
				await ctx.prisma.activityTransportItem.deleteMany({
					where: { activityId: input.id }
				});
			}

			const activity = await ctx.prisma.activity.update({
				where: {
					id: input.id
				},
				data: {
					...activityData,
					startTime,
					endTime,
					transitDistance: activityData.transitDistance || undefined,
					transitDuration: activityData.transitDuration || undefined,
					transportItems:
						transportItems && transportItems.length > 0
							? {
									create: transportItems.map((item) => ({
										type: item.type,
										amount: item.amount,
										note: item.note
									}))
								}
							: undefined
				},
				include: {
					transportItems: true
				}
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return { activity };
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.activity.assert(input.id);
			await ctx.owned.activity.assertNoneOnLockedInvoice([input.id]);

			const activity = await ctx.prisma.activity.delete({
				where: {
					id: input.id
				}
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return true;
		}),
	bulkAdd: authedProcedure
		.input(
			z.object({
				activities: z.array(activitySchema),
				autoCreateTrip: z.boolean().default(true)
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { activities: inputActivities, autoCreateTrip } = input;

			if (inputActivities.length === 0) {
				return { activities: [], tripId: null };
			}

			const clientIds = [...new Set(inputActivities.map((a) => a.clientId))];
			const supportItemIds = [
				...new Set(inputActivities.map((a) => a.supportItemId))
			];
			for (const clientId of clientIds) {
				await ctx.owned.client.assert(clientId);
			}
			for (const supportItemId of supportItemIds) {
				await ctx.owned.supportItem.assert(supportItemId);
			}

			const groupSizeSupportItemIds = [
				...new Set(
					inputActivities
						.filter((activity) => activity.groupSize !== undefined)
						.map((activity) => activity.supportItemId)
				)
			];

			if (groupSizeSupportItemIds.length > 0) {
				const groupSupportItems = await ctx.owned.supportItem.findMany({
					where: { id: { in: groupSizeSupportItemIds }, isGroup: true }
				});

				if (groupSupportItems.length !== groupSizeSupportItemIds.length) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "groupSize can only be set for group support items"
					});
				}
			}

			// Parse and validate all activities
			const parsedActivities: ActivityDraft[] = inputActivities.map(
				(activity) => ({
					clientId: activity.clientId,
					supportItemId: activity.supportItemId,
					date: activity.date,
					startTime: activity.startTime
						? parseUtcTime(activity.startTime)
						: undefined,
					endTime: activity.endTime
						? parseUtcTime(activity.endTime)
						: undefined,
					groupSize: activity.groupSize,
					transitDistance: activity.transitDistance || undefined,
					transitDuration: activity.transitDuration || undefined,
					transportItems: activity.transportItems
				})
			);

			// Sort by start time for contiguity check
			const sorted = [...parsedActivities].sort((a, b) => {
				if (!a.startTime || !b.startTime) return 0;
				return a.startTime.getTime() - b.startTime.getTime();
			});

			const { activities, tripId } = await ctx.prisma.$transaction((tx) =>
				createActivityBatch(tx, ctx.session.user.id, sorted, (created) => {
					// A manually entered day only becomes a Trip when its Activities
					// run back to back (end time equals the next start time); anything
					// else keeps the transit that was entered by hand.
					if (
						!autoCreateTrip ||
						created.length < 2 ||
						!created.every((a) => a.startTime && a.endTime)
					) {
						return null;
					}

					const isContiguous = created.every((activity, index) => {
						if (index === 0) return true;
						const prevActivity = created[index - 1];
						if (!prevActivity.endTime || !activity.startTime) return false;
						// Check if end time of previous equals start time of current
						return (
							format(utcDate(prevActivity.endTime), "HH:mm") ===
							format(utcDate(activity.startTime), "HH:mm")
						);
					});
					if (!isContiguous) return null;

					// Inter-client legs of a manually entered day derive from each
					// Client's stored distance - see ADR 0002.
					const legs = [];
					for (let i = 0; i < created.length - 1; i++) {
						const toActivity = created[i + 1];
						legs.push({
							fromActivityId: created[i].id,
							toActivityId: toActivity.id,
							distance: Number(toActivity.client?.distanceToClient ?? 0),
							duration: Number(toActivity.client?.travelTimeToClient ?? 0)
						});
					}

					return { activities: created, legs };
				})
			);

			return { activities, tripId };
		})
});

export type ActivityListOutput = inferRouterOutputs<
	typeof activityRouter
>["list"];

export type ActivityByIdOutput = inferRouterOutputs<
	typeof activityRouter
>["byId"];

export type ActivityByDateRangeOutput = inferRouterOutputs<
	typeof activityRouter
>["byDateRange"];

export type ActivityUnbilledListOutput = inferRouterOutputs<
	typeof activityRouter
>["unbilledList"];
