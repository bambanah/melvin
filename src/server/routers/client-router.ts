import { authedProcedure, router } from "@server/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { baseListQueryInput } from "@utils/trpc";
import { z } from "zod";

const defaultClientSelect = {
	id: true,
	name: true,
	number: true,
	billTo: true,
	invoices: {
		select: {
			invoiceNo: true,
			billTo: true,
		},
	},
};

export const defaultClientCreate = z.object({
	id: z.string().optional(),
	name: z.string(),
	number: z.string().nullish(),
	billTo: z.string().nullish(),
});

export const clientRouter = router({
	list: authedProcedure
		.input(baseListQueryInput)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? 50;
			const { cursor } = input;

			const clients = await ctx.prisma.client.findMany({
				take: limit + 1,
				select: {
					...defaultClientSelect,
					invoices: {
						take: 1,
						select: { id: true, invoiceNo: true, billTo: true },
						orderBy: {
							createdAt: "desc",
						},
					},
				},
				where: { ownerId: ctx.session.user.id },
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: {
					createdAt: "asc",
				},
			});

			let nextCursor: typeof cursor | undefined;
			if (clients.length > limit) {
				const nextClient = clients.pop();
				nextCursor = nextClient?.id;
			}

			return {
				clients: clients.reverse(),
				nextCursor,
			};
		}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const client = await ctx.prisma.client.findFirst({
				select: { ...defaultClientSelect, id: true },
				where: {
					ownerId: ctx.session.user.id,
					id: input.id,
				},
			});

			if (client) return client;
			else throw new TRPCError({ code: "NOT_FOUND" });
		}),
	latestInvoice: authedProcedure
		.input(z.object({ clientId: z.string() }))
		.query(async ({ input, ctx }) => {
			const { clientId } = input;

			const invoice = await ctx.prisma.invoice.findFirst({
				where: { clientId, ownerId: ctx.session.user.id },
				select: {
					id: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			return { id: invoice?.id };
		}),
	create: authedProcedure
		.input(
			z.object({
				client: defaultClientCreate,
			})
		)
		.mutation(async ({ input, ctx }) => {
			const client = await ctx.prisma.client.create({
				data: { ...input.client, ownerId: ctx.session.user.id },
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			return client;
		}),
	update: authedProcedure
		.input(
			z.object({
				id: z.string(),
				client: defaultClientCreate,
			})
		)
		.mutation(async ({ input, ctx }) => {
			const client = await ctx.prisma.client.update({
				where: {
					id: input.id,
				},
				data: { ...input.client },
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			return { activity: client };
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const client = await ctx.prisma.client.delete({
				where: {
					id: input.id,
				},
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			return {};
		}),
});

export type ClientListOutput = inferRouterOutputs<
	typeof clientRouter
>["list"]["clients"][0];

export type ClientByIdOutput = inferRouterOutputs<typeof clientRouter>["byId"];
