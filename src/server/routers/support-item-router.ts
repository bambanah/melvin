import { RateType } from "@prisma/client";
import { authedProcedure, router } from "@server/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { baseListQueryInput } from "@utils/trpc";
import { z } from "zod";

const defaultSupportItemSelect = {
	id: true,
	description: true,
	rateType: true,
	weekdayCode: true,
	weekdayRate: true,
};

export const defaultSupportItemCreate = z.object({
	id: z.string().optional(),
	description: z.string(),
	rateType: z.nativeEnum(RateType),
	weekdayCode: z.string(),
	weekdayRate: z.string(),
	weeknightCode: z.string().optional(),
	weeknightRate: z.string().optional(),
	saturdayCode: z.string().optional(),
	saturdayRate: z.string().optional(),
	sundayCode: z.string().optional(),
	sundayRate: z.string().optional(),
});

export const supportItemRouter = router({
	list: authedProcedure
		.input(baseListQueryInput)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? 50;
			const { cursor } = input;

			const supportItems = await prisma.supportItem.findMany({
				select: defaultSupportItemSelect,
				take: limit + 1,
				where: {
					ownerId: ctx.session.user.id,
				},
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: {
					createdAt: "asc",
				},
			});

			let nextCursor: typeof cursor | undefined;
			if (supportItems.length > limit) {
				const nextSupportItem = supportItems.pop();
				nextCursor = nextSupportItem?.id;
			}

			return {
				supportItems: supportItems.reverse(),
				nextCursor,
			};
		}),
	byId: authedProcedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.query(async ({ input, ctx }) => {
			const activity = await prisma.supportItem.findFirst({
				select: {
					...defaultSupportItemSelect,
					weeknightCode: true,
					weeknightRate: true,
					saturdayCode: true,
					saturdayRate: true,
					sundayCode: true,
					sundayRate: true,
				},
				where: {
					ownerId: ctx.session.user.id,
					id: input.id,
				},
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return activity;
		}),
	add: authedProcedure
		.input(
			z.object({
				supportItem: defaultSupportItemCreate,
			})
		)
		.mutation(async ({ input, ctx }) => {
			const activity = await prisma.supportItem.create({
				data: { ...input.supportItem, ownerId: ctx.session.user.id },
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
				supportItem: defaultSupportItemCreate,
			})
		)
		.mutation(async ({ input }) => {
			const activity = await prisma.supportItem.update({
				where: {
					id: input.id,
				},
				data: { ...input.supportItem },
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return { activity };
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			const activity = await prisma.supportItem.delete({
				where: {
					id: input.id,
				},
			});

			if (!activity) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return {};
		}),
});

export type SupportItemFetchAllOutput = inferRouterOutputs<
	typeof supportItemRouter
>["list"]["supportItems"][0];

export type SupportItemByIdOutput = inferRouterOutputs<
	typeof supportItemRouter
>["byId"];
