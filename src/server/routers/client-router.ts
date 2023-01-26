import { authedProcedure, router } from "@server/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { z } from "zod";

const defaultClientSelect = {
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
	list: authedProcedure.query(async () => {
		const clients = await prisma.client.findMany({
			include: {
				invoices: {
					take: 1,
					select: { id: true, invoiceNo: true, billTo: true },
					orderBy: {
						createdAt: "desc",
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		if (!clients) {
			throw new TRPCError({ code: "NOT_FOUND" });
		}

		return clients;
	}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			const client = await prisma.client.findFirst({
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

			const invoice = await prisma.invoice.findFirst({
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
			const client = await prisma.client.create({
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
		.mutation(async ({ input }) => {
			const client = await prisma.client.update({
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
		.mutation(async ({ input }) => {
			const client = await prisma.client.delete({
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
>["list"][0];

export type ClientByIdOutput = inferRouterOutputs<typeof clientRouter>["byId"];
