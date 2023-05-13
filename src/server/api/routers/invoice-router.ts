import { Invoice, InvoiceStatus } from "@prisma/client";
import { activitySchema } from "@schema/activity-schema";
import { invoiceSchema } from "@schema/invoice-schema";
import { authedProcedure, router } from "@server/api/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { getTotalCostOfActivities } from "@utils/activity-utils";
import { baseListQueryInput } from "@utils/trpc";
import dayjs from "dayjs";
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

function parseInvoice<T extends Partial<Invoice>>(
	invoice: T
): Omit<T, "date"> & { date?: string } {
	return {
		...invoice,
		date: dayjs(invoice.date).format("YYYY-MM-DD"),
	};
}

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
				invoices: invoices.map((invoice) => parseInvoice(invoice)).reverse(),
				nextCursor,
			};
		}),
	getTotalOwing: authedProcedure.query(async ({ ctx }) => {
		const invoices = await ctx.prisma.invoice.findMany({
			select: {
				activities: {
					include: {
						supportItem: true,
					},
				},
			},
			where: {
				status: "SENT",
			},
		});

		const totalOwing = invoices.reduce(
			(total, invoice) =>
				(total += getTotalCostOfActivities(invoice.activities)),
			0
		);

		return totalOwing;
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

			return parseInvoice(invoice);
		}),
	create: authedProcedure
		.input(
			z.object({
				invoice: invoiceSchema,
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { invoice: inputInvoice } = input;
			const invoice = await ctx.prisma.invoice.create({
				data: {
					invoiceNo: inputInvoice.invoiceNo,
					billTo: inputInvoice.billTo,
					clientId: inputInvoice.clientId,
					date: inputInvoice.date ? new Date(inputInvoice.date) : new Date(),
					ownerId: ctx.session.user.id,
					activities: {
						connect: inputInvoice.activityIds?.map((id) => ({ id })),
					},
				},
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return parseInvoice(invoice);
		}),
	modify: authedProcedure
		.input(
			z.object({
				id: z.string(),
				invoice: invoiceSchema,
				activities: z.array(activitySchema).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const invoice = await ctx.prisma.invoice.update({
				where: {
					id: input.id,
				},
				data: { ...input.invoice },
				select: {
					date: true,
					invoiceNo: true,
				},
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return {
				invoice: parseInvoice(invoice),
			};
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

			return parseInvoice(invoice);
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

export type InvoiceListOutput = inferRouterOutputs<
	typeof invoiceRouter
>["list"]["invoices"][0];

export type InvoiceByIdOutput = inferRouterOutputs<
	typeof invoiceRouter
>["byId"];
