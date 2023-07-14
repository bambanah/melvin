import { Prisma } from "@prisma/client";
import { supportItemSchema } from "@schema/support-item-schema";
import { authedProcedure, router } from "@server/api/trpc";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { baseListQueryInput } from "@utils/trpc";
import { z } from "zod";

const defaultSupportItemSelect = {
	id: true,
	description: true,
	rateType: true,
	isGroup: true,
	weekdayCode: true,
	weekdayRate: true,
	weeknightCode: true,
	weeknightRate: true,
	saturdayCode: true,
	saturdayRate: true,
	sundayCode: true,
	sundayRate: true,
} as const satisfies Prisma.SupportItemSelect;

export const supportItemRouter = router({
	list: authedProcedure
		.input(baseListQueryInput)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? 50;
			const { cursor } = input;

			const supportItems = await ctx.prisma.supportItem.findMany({
				select: defaultSupportItemSelect,
				take: limit + 1,
				where: {
					ownerId: ctx.session.user.id,
				},
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: {
					createdAt: "desc",
				},
			});

			let nextCursor: typeof cursor | undefined;
			if (supportItems.length > limit) {
				const nextSupportItem = supportItems.pop();
				nextCursor = nextSupportItem?.id;
			}

			return {
				supportItems,
				nextCursor,
			};
		}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const supportItem = await ctx.prisma.supportItem.findFirst({
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

			if (!supportItem) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return supportItem;
		}),
	create: authedProcedure
		.input(
			z.object({
				supportItem: supportItemSchema,
			})
		)
		.mutation(async ({ ctx, input }) => {
			const supportItem = await ctx.prisma.supportItem.create({
				data: {
					...input.supportItem,
					ownerId: ctx.session.user.id,
				},
			});

			if (!supportItem) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Couldn't create support item",
				});
			}

			return supportItem;
		}),
	update: authedProcedure
		.input(
			z.object({
				supportItem: supportItemSchema.extend({ id: z.string() }),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const supportItem = await ctx.prisma.supportItem.update({
				where: {
					id: input.supportItem.id,
				},
				data: input.supportItem,
			});

			if (!supportItem) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Couldn't update support item",
				});
			}

			return supportItem;
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const supportItem = await ctx.prisma.supportItem.delete({
				where: {
					id: input.id,
				},
			});

			if (!supportItem) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return "Deleted";
		}),
});

export type SupportItemListOutput = inferRouterOutputs<
	typeof supportItemRouter
>["list"]["supportItems"][0];

export type SupportItemByIdOutput = inferRouterOutputs<
	typeof supportItemRouter
>["byId"];
