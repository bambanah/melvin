import { authedProcedure, router } from "@server/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { baseListQueryInput } from "@utils/trpc";
import { z } from "zod";
import { defaultActivityCreate } from "./activity-router";

const defaultInvoiceSelect = {
	id: true,
	billTo: true,
	invoiceNo: true,
	date: true,
	client: {
		select: { name: true, number: true },
	},
	activities: {
		select: {
			// TODO: Only return id, currently need the full activity for cost generation
			startTime: true,
			endTime: true,
			transitDistance: true,
			transitDuration: true,
			itemDistance: true,
			date: true,
			supportItem: true,
		},
	},
};

const defaultInvoiceCreate = z.object({
	date: z.date().optional(),
	clientId: z.string(),
	billTo: z.string(),
	invoiceNo: z.string(),
});

export const invoiceRouter = router({
	list: authedProcedure
		.input(baseListQueryInput)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? 50;
			const { cursor } = input;

			const invoices = await prisma.invoice.findMany({
				select: {
					...defaultInvoiceSelect,
					_count: {
						select: { activities: true },
					},
				},
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
			if (invoices.length > limit) {
				const nextInvoice = invoices.pop();
				nextCursor = nextInvoice?.id;
			}

			return {
				invoices: invoices.reverse(),
				nextCursor,
			};
		}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const invoice = await prisma.invoice.findFirst({
				select: defaultInvoiceSelect,
				where: {
					ownerId: ctx.session.user.id,
					id: input.id,
				},
			});

			return invoice;
		}),
	create: authedProcedure
		.input(
			z.object({
				invoice: defaultInvoiceCreate,
				activities: z.array(defaultActivityCreate),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { invoice, activities } = input;

			const activity = await prisma.invoice.create({
				data: {
					...invoice,
					date: invoice.date ?? new Date(),
					ownerId: ctx.session.user.id,
					activities: {
						createMany: {
							data: activities.map((activity) => ({
								...activity,
								ownerId: ctx.session.user.id,
							})),
						},
					},
				},
			});

			if (!activity) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			return activity;
		}),
	modify: authedProcedure
		.input(z.object({ id: z.string(), invoice: defaultInvoiceCreate }))
		.mutation(async ({ input }) => {
			const invoice = await prisma.invoice.update({
				where: {
					id: input.id,
				},
				data: { ...input.invoice },
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return invoice;
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			const invoice = await prisma.invoice.delete({
				where: {
					id: input.id,
				},
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return {};
		}),
});

export type InvoiceFetchAllOutput = inferRouterOutputs<
	typeof invoiceRouter
>["list"]["invoices"][0];

export type InvoiceByIdOutput = inferRouterOutputs<
	typeof invoiceRouter
>["byId"];
