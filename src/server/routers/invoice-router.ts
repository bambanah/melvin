import { InvoiceStatus } from "@prisma/client";
import { activitySchema } from "@schema/activity-schema";
import { authedProcedure, router } from "@server/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { baseListQueryInput } from "@utils/trpc";
import { z } from "zod";

const defaultInvoiceSelect = {
	id: true,
	billTo: true,
	invoiceNo: true,
	date: true,
	status: true,
	client: {
		select: { name: true, number: true, id: true },
	},
	activities: {
		select: {
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
		.input(
			baseListQueryInput.extend({
				status: z.nativeEnum(InvoiceStatus).array().optional(),
				clientId: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? 50;
			const { cursor, status, clientId } = input;

			const invoices = await ctx.prisma.invoice.findMany({
				select: {
					...defaultInvoiceSelect,
					_count: {
						select: { activities: true },
					},
				},
				take: limit + 1,
				where: {
					ownerId: ctx.session.user.id,
					status: { in: status },
					clientId,
				},
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: [
					{
						status: "desc",
					},
					{
						updatedAt: "asc",
					},
				],
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
			const invoice = await ctx.prisma.invoice.findFirst({
				select: {
					...defaultInvoiceSelect,
					createdAt: true,
					status: true,
					clientId: true,
					ownerId: true,
					activities: {
						select: {
							...defaultInvoiceSelect.activities.select,
							id: true,
							supportItemId: true,
						},
					},
				},
				where: {
					ownerId: ctx.session.user.id,
					id: input.id,
				},
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return invoice;
		}),
	create: authedProcedure
		.input(
			z.object({
				invoice: defaultInvoiceCreate,
				activities: z.array(activitySchema),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { invoice, activities } = input;

			const activity = await ctx.prisma.invoice.create({
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
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return activity;
		}),
	modify: authedProcedure
		.input(z.object({ id: z.string(), invoice: defaultInvoiceCreate }))
		.mutation(async ({ ctx, input }) => {
			const invoice = await ctx.prisma.invoice.update({
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
	updateStatus: authedProcedure
		.input(z.object({ id: z.string(), status: z.nativeEnum(InvoiceStatus) }))
		.mutation(async ({ ctx, input }) => {
			const invoice = await ctx.prisma.invoice.update({
				where: {
					id: input.id,
				},
				data: { status: input.status },
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return invoice;
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invoice = await ctx.prisma.invoice.delete({
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
