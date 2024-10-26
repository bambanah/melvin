import { baseListQueryInput } from "@/lib/trpc";
import { supportItemRatesSchema } from "@/schema/support-item-rates-schema";
import { supportItemSchema } from "@/schema/support-item-schema";
import { authedProcedure, router } from "@/server/api/trpc";
import { Prisma } from "@prisma/client";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { z } from "zod";
import { DEFAULT_LIST_LIMIT } from "./router.constants";

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
		.input(
			baseListQueryInput.extend({
				description: z.string().optional(),
				isGroup: z.boolean().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? DEFAULT_LIST_LIMIT;
			const { cursor, description, isGroup } = input;

			const supportItems = await ctx.prisma.supportItem.findMany({
				select: defaultSupportItemSelect,
				take: limit + 1,
				where: {
					ownerId: ctx.session.user.id,
					description: description
						? {
								contains: description,
								mode: "insensitive",
							}
						: undefined,
					isGroup,
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
	addCustomRates: authedProcedure
		.input(
			z.object({
				supportItemRates: supportItemRatesSchema.extend({
					clientId: z.string().optional(),
				}),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const customRates = await ctx.prisma.supportItemRates.create({
				data: {
					...input.supportItemRates,
					ownerId: ctx.session.user.id,
				},
			});

			if (!customRates) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Couldn't create custom support item rates",
				});
			}

			return customRates;
		}),
	getCustomRatesForClient: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const customRates = await ctx.prisma.supportItemRates.findMany({
				where: {
					ownerId: ctx.session.user.id,
					clientId: input.id,
				},
				include: {
					supportItem: {
						select: {
							description: true,
						},
					},
				},
			});

			if (!customRates) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Couldn't find custom support item rates",
				});
			}

			return customRates;
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
