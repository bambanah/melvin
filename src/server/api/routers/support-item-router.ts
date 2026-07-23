import { baseListQueryInput } from "@/lib/trpc";
import { supportItemRatesSchema } from "@/schema/support-item-rates-schema";
import { supportItemSchema } from "@/schema/support-item-schema";
import { amendFirst, paginate } from "@/server/api/owned";
import { authedProcedure, router } from "@/server/api/trpc";
import { Prisma } from "@/generated/client";
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
	sundayRate: true
} as const satisfies Prisma.SupportItemSelect;

export const supportItemRouter = router({
	list: authedProcedure
		.input(
			baseListQueryInput.extend({
				description: z.string().optional(),
				isGroup: z.boolean().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? DEFAULT_LIST_LIMIT;
			const { cursor, description, isGroup } = input;

			const { items: supportItems, nextCursor } = await paginate({
				limit,
				cursor,
				query: ({ take, cursor }) =>
					ctx.owned.supportItem.findMany({
						select: defaultSupportItemSelect,
						take,
						where: {
							description: description
								? {
										contains: description,
										mode: "insensitive"
									}
								: undefined,
							isGroup
						},
						cursor,
						orderBy: {
							createdAt: "desc"
						}
					})
			});

			return {
				supportItems,
				nextCursor
			};
		}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const supportItem = await ctx.owned.supportItem.findFirst({
				select: {
					...defaultSupportItemSelect,
					weeknightCode: true,
					weeknightRate: true,
					saturdayCode: true,
					saturdayRate: true,
					sundayCode: true,
					sundayRate: true
				},
				where: {
					id: input.id
				}
			});

			if (!supportItem) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return supportItem;
		}),
	create: authedProcedure
		.input(
			z.object({
				supportItem: supportItemSchema
			})
		)
		.mutation(async ({ ctx, input }) => {
			const supportItem = await ctx.prisma.supportItem.create({
				data: {
					...input.supportItem,
					ownerId: ctx.session.user.id
				}
			});

			if (!supportItem) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Couldn't create support item"
				});
			}

			return supportItem;
		}),
	addCustomRates: authedProcedure
		.input(
			z.object({
				supportItemRates: supportItemRatesSchema.extend({
					clientId: z.string().optional()
				})
			})
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.supportItem.assert(input.supportItemRates.supportItemId);
			if (input.supportItemRates.clientId) {
				await ctx.owned.client.assert(input.supportItemRates.clientId);
			}

			const customRates = await ctx.prisma.supportItemRates.create({
				data: {
					...input.supportItemRates,
					ownerId: ctx.session.user.id
				}
			});

			if (!customRates) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Couldn't create custom support item rates"
				});
			}

			return customRates;
		}),
	getCustomRatesForClient: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const customRates = await ctx.owned.supportItemRates.findMany({
				where: {
					clientId: input.id
				},
				include: {
					supportItem: {
						select: {
							description: true
						}
					}
				}
			});

			if (!customRates) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Couldn't find custom support item rates"
				});
			}

			return customRates;
		}),
	updateCustomRate: authedProcedure
		.input(
			z.object({
				id: z.string(),
				supportItemRates: supportItemRatesSchema.partial()
			})
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.supportItemRates.assert(input.id);
			if (input.supportItemRates.supportItemId) {
				await ctx.owned.supportItem.assert(
					input.supportItemRates.supportItemId
				);
			}

			const customRate = await ctx.prisma.supportItemRates.update({
				where: {
					id: input.id
				},
				data: {
					...input.supportItemRates
				}
			});

			if (!customRate) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Couldn't update custom support item rate"
				});
			}

			return customRate;
		}),
	deleteCustomRate: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.supportItemRates.assert(input.id);

			const customRate = await ctx.prisma.supportItemRates.delete({
				where: {
					id: input.id
				}
			});

			if (!customRate) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Couldn't delete custom support item rate"
				});
			}

			return customRate;
		}),
	update: authedProcedure
		.input(
			z.object({
				supportItem: supportItemSchema.extend({ id: z.string() })
			})
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.supportItem.assert(input.supportItem.id);

			const supportItem = await ctx.prisma.supportItem.update({
				where: {
					id: input.supportItem.id
				},
				data: input.supportItem
			});

			if (!supportItem) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Couldn't update support item"
				});
			}

			return supportItem;
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.supportItem.assert(input.id);

			// The schema cascade-deletes Activity rows on SupportItem delete —
			// without this guard that would silently eat a sent invoice's
			// frozen-in-spirit activities.
			const lockedActivity = await ctx.prisma.activity.findFirst({
				where: {
					supportItemId: input.id,
					invoice: { status: { not: "CREATED" } }
				},
				select: { invoice: { select: { invoiceNo: true } } }
			});
			if (lockedActivity?.invoice) {
				amendFirst(lockedActivity.invoice.invoiceNo);
			}

			const supportItem = await ctx.prisma.supportItem.delete({
				where: {
					id: input.id
				}
			});

			if (!supportItem) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return "Deleted";
		})
});

export type SupportItemListOutput = inferRouterOutputs<
	typeof supportItemRouter
>["list"]["supportItems"][0];

export type SupportItemByIdOutput = inferRouterOutputs<
	typeof supportItemRouter
>["byId"];
