import { getNextInvoiceNo } from "@/lib/invoice-utils";
import { baseListQueryInput } from "@/lib/trpc";
import { clientSchema } from "@/schema/client-schema";
import { paginate } from "@/server/api/owned";
import { authedProcedure, router } from "@/server/api/trpc";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { z } from "zod";
import { DEFAULT_LIST_LIMIT } from "./router.constants";

const defaultClientSelect = {
	id: true,
	name: true,
	number: true,
	billTo: true,
	invoiceNumberPrefix: true,
	invoices: {
		select: {
			invoiceNo: true,
			billTo: true
		}
	}
};

export const clientRouter = router({
	list: authedProcedure
		.input(baseListQueryInput)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? DEFAULT_LIST_LIMIT;
			const { cursor } = input;

			const { items: clients, nextCursor } = await paginate({
				limit,
				cursor,
				query: ({ take, cursor }) =>
					ctx.owned.client.findMany({
						take,
						select: {
							...defaultClientSelect,
							invoices: {
								take: 1,
								select: {
									id: true,
									invoiceNo: true,
									billTo: true,
									date: true
								},
								orderBy: {
									createdAt: "desc"
								}
							}
						},
						cursor,
						orderBy: {
							createdAt: "desc"
						}
					})
			});

			return {
				clients,
				nextCursor
			};
		}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const client = await ctx.owned.client.findFirst({
				select: {
					...defaultClientSelect,
					invoiceNumberPrefix: true,
					distanceToClient: true,
					travelTimeToClient: true,
					transitRatePerKm: true,
					invoiceEmail: true
				},
				where: {
					id: input.id
				}
			});

			if (client) return client;
			else throw new TRPCError({ code: "NOT_FOUND" });
		}),
	getBillTo: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const client = await ctx.owned.client.findFirst({
				select: {
					billTo: true
				},
				where: {
					id: input.id
				}
			});

			if (!client) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return client.billTo;
		}),
	getNextInvoiceNo: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const client = await ctx.owned.client.findFirst({
				select: {
					invoices: {
						take: 20,
						select: {
							invoiceNo: true
						},
						orderBy: {
							createdAt: "desc"
						}
					},
					invoiceNumberPrefix: true
				},
				where: {
					id: input.id
				}
			});

			if (!client) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const { nextInvoiceNo, latestInvoiceNo } = getNextInvoiceNo(
				client.invoices.map((i) => i.invoiceNo),
				client.invoiceNumberPrefix
			);

			return { nextInvoiceNo, latestInvoiceNo };
		}),
	latestInvoice: authedProcedure
		.input(z.object({ clientId: z.string() }))
		.query(async ({ input, ctx }) => {
			const { clientId } = input;

			const invoice = await ctx.owned.invoice.findFirst({
				where: { clientId },
				select: {
					id: true
				},
				orderBy: {
					createdAt: "desc"
				}
			});

			return { id: invoice?.id };
		}),
	create: authedProcedure
		.input(
			z.object({
				client: clientSchema
			})
		)
		.mutation(async ({ input, ctx }) => {
			const client = await ctx.prisma.client.create({
				data: {
					...input.client,
					distanceToClient: input.client.distanceToClient
						? parseFloat(input.client.distanceToClient)
						: undefined,
					travelTimeToClient: input.client.travelTimeToClient
						? parseFloat(input.client.travelTimeToClient)
						: undefined,
					transitRatePerKm: input.client.transitRatePerKm
						? parseFloat(input.client.transitRatePerKm)
						: undefined,
					ownerId: ctx.session.user.id
				}
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND"
				});
			}

			return client;
		}),
	update: authedProcedure
		.input(
			z.object({
				id: z.string(),
				client: clientSchema
			})
		)
		.mutation(async ({ input, ctx }) => {
			await ctx.owned.client.assert(input.id);

			const client = await ctx.prisma.client.update({
				where: {
					id: input.id
				},
				data: {
					...input.client,
					distanceToClient: input.client.distanceToClient
						? parseFloat(input.client.distanceToClient)
						: undefined,
					travelTimeToClient: input.client.travelTimeToClient
						? parseFloat(input.client.travelTimeToClient)
						: undefined,
					transitRatePerKm: input.client.transitRatePerKm
						? parseFloat(input.client.transitRatePerKm)
						: undefined
				}
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND"
				});
			}

			return { client };
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input, ctx }) => {
			await ctx.owned.client.assert(input.id);

			const client = await ctx.prisma.client.delete({
				where: {
					id: input.id
				}
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND"
				});
			}

			return {};
		})
});

export type ClientListOutput = inferRouterOutputs<
	typeof clientRouter
>["list"]["clients"][0];

export type ClientByIdOutput = inferRouterOutputs<typeof clientRouter>["byId"];
