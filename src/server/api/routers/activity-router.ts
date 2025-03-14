import { baseListQueryInput } from "@/lib/trpc";
import { activitySchema } from "@/schema/activity-schema";
import { authedProcedure, router } from "@/server/api/trpc";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

import dayjs from "dayjs";
import { DEFAULT_LIST_LIMIT } from "./router.constants";
import { Activity } from "@prisma/client";
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.extend(require("dayjs/plugin/customParseFormat"));

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
		},
	},
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
				clientId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? DEFAULT_LIST_LIMIT;
			const { assigned, invoiceId, clientId, cursor } = input;

			const activities = await ctx.prisma.activity.findMany({
				select: {
					...defaultActivitySelect,
					invoice: {
						select: { id: true, invoiceNo: true },
					},
				},
				take: limit + 1,
				cursor: cursor ? { id: cursor } : undefined,
				where: {
					ownerId: ctx.session.user.id,
					invoiceId: invoiceId ?? getInvoiceIdWhereCondition(assigned),
					clientId,
				},
				orderBy: [
					{
						date: "desc",
					},
					{
						startTime: "desc",
					},
				],
			});

			let nextCursor: typeof cursor | undefined;
			if (activities.length > limit) {
				const nextInvoice = activities.pop();
				nextCursor = nextInvoice?.id;
			}

			return {
				activities,
				nextCursor,
			};
		}),
	pending: authedProcedure.query(async ({ ctx }) => {
		const activities = await ctx.prisma.activity.findMany({
			select: defaultActivitySelect,
			where: {
				ownerId: ctx.session.user.id,
				invoiceId: null,
			},
		});

		const groupedActivities = activities.reduce<
			Record<string, Partial<Activity>[]>
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
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const activity = await ctx.prisma.activity.findFirst({
				select: defaultActivitySelect,
				where: {
					id: input.id,
					ownerId: ctx.session.user.id,
				},
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return activity;
		}),
	forInvoice: authedProcedure
		.input(z.object({ invoiceId: z.string() }))
		.query(async ({ input, ctx }) => {
			const activities = await ctx.prisma.activity.findMany({
				select: defaultActivitySelect,
				where: {
					ownerId: ctx.session.user.id,
					invoiceId: input.invoiceId,
				},
			});

			return activities.length > 0
				? { activities }
				: new TRPCError({ code: "NOT_FOUND" });
		}),
	add: authedProcedure
		.input(
			z.object({
				activity: activitySchema,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { activity: inputActivity } = input;

			const activity = await ctx.prisma.activity.create({
				data: {
					...inputActivity,
					startTime: inputActivity.startTime
						? dayjs.utc(inputActivity.startTime, "HH:mm").toDate()
						: undefined,
					endTime: inputActivity.endTime
						? dayjs.utc(inputActivity.endTime, "HH:mm").toDate()
						: undefined,
					transitDistance: inputActivity.transitDistance || undefined,
					transitDuration: inputActivity.transitDuration || undefined,
					ownerId: ctx.session.user.id,
				},
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
				activity: activitySchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const activity = await ctx.prisma.activity.update({
				where: {
					id: input.id,
				},
				data: {
					...input.activity,
					startTime: input.activity.startTime
						? dayjs.utc(input.activity.startTime, "HH:mm").toDate()
						: undefined,
					endTime: input.activity.endTime
						? dayjs.utc(input.activity.endTime, "HH:mm").toDate()
						: undefined,
					transitDistance: input.activity.transitDistance || undefined,
					transitDuration: input.activity.transitDuration || undefined,
				},
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return { activity };
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const activity = await ctx.prisma.activity.delete({
				where: {
					id: input.id,
				},
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return true;
		}),
});

export type ActivityListOutput = inferRouterOutputs<
	typeof activityRouter
>["list"];

export type ActivityByIdOutput = inferRouterOutputs<
	typeof activityRouter
>["byId"];
