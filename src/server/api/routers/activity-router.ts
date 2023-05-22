import { activitySchema } from "@schema/activity-schema";
import { authedProcedure, router } from "@server/api/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { z } from "zod";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { baseListQueryInput } from "@utils/trpc";
dayjs.extend(utc);
dayjs.extend(customParseFormat);

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
			})
		)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? 50;
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
					invoiceId:
						assigned === undefined
							? invoiceId
							: getInvoiceIdWhereCondition(assigned),
					clientId,
				},
				orderBy: [
					{
						date: "asc",
					},
					{
						startTime: "asc",
					},
				],
			});

			let nextCursor: typeof cursor | undefined;
			if (activities.length > limit) {
				const nextInvoice = activities.pop();
				nextCursor = nextInvoice?.id;
			}

			return {
				activities: activities.reverse(),
				nextCursor,
			};
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
			})
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
					date: dayjs.utc(inputActivity.date, "YYYY-MM-DD").toDate(),
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
			})
		)
		.mutation(async ({ ctx, input }) => {
			const activity = await ctx.prisma.activity.update({
				where: {
					id: input.id,
				},
				data: {
					...input.activity,
					date: dayjs.utc(input.activity.date, "YYYY-MM-DD").toDate(),
					startTime: input.activity.startTime
						? dayjs.utc(input.activity.startTime, "HH:mm").toDate()
						: undefined,
					endTime: input.activity.endTime
						? dayjs.utc(input.activity.endTime, "HH:mm").toDate()
						: undefined,
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
