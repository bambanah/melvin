import { activitySchema } from "@schema/activity-schema";
import { authedProcedure, router } from "@server/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { z } from "zod";

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
};

function getInvoiceIdWhereCondition(invoiceIdAssigned?: boolean) {
	if (invoiceIdAssigned === undefined) return;

	return invoiceIdAssigned ? { not: null } : { equals: null };
}

export const activityRouter = router({
	list: authedProcedure
		.input(z.object({ assigned: z.boolean().optional() }))
		.query(async ({ ctx, input }) => {
			const { assigned } = input;

			const activities = await ctx.prisma.activity.findMany({
				select: {
					...defaultActivitySelect,
					invoice: {
						select: { id: true, invoiceNo: true },
					},
				},
				where: {
					ownerId: ctx.session.user.id,
					invoiceId: getInvoiceIdWhereCondition(assigned),
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

			return {
				activities,
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
			const activity = await ctx.prisma.activity.create({
				data: { ...input.activity, ownerId: ctx.session.user.id },
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
				data: { ...input.activity },
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

export type ActivityFetchAllOutput = inferRouterOutputs<
	typeof activityRouter
>["list"]["activities"][0];

export type ActivityByIdOutput = inferRouterOutputs<
	typeof activityRouter
>["byId"];
