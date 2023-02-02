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

export const defaultActivityCreate = z.object({
	id: z.string().optional(),
	supportItemId: z.string(),
	clientId: z.string(),
	date: z.date(),
	startTime: z.date(),
	endTime: z.date(),
	itemDistance: z.number().nullish(),
	transitDistance: z.number().nullish(),
	transitDuration: z.number().nullish(),
});

export const activityRouter = router({
	list: authedProcedure.query(async ({ ctx }) => {
		const activities = await prisma.activity.findMany({
			select: defaultActivitySelect,
			where: {
				ownerId: ctx.session.user.id,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return {
			activities,
		};
	}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const activity = await prisma.activity.findFirst({
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
			const activities = await prisma.activity.findMany({
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
				activity: defaultActivityCreate,
			})
		)
		.mutation(async ({ input, ctx }) => {
			const activity = await prisma.activity.create({
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
				activity: defaultActivityCreate,
			})
		)
		.mutation(async ({ input }) => {
			const activity = await prisma.activity.update({
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
		.mutation(async ({ input }) => {
			const activity = await prisma.activity.delete({
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
