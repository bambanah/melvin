import { Client, Invoice, InvoiceStatus } from "@prisma/client";
import { activitySchema } from "@schema/activity-schema";
import { InvoiceSchema, invoiceSchema } from "@schema/invoice-schema";
import { authedProcedure, router } from "@server/api/trpc";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { getTotalCostOfActivities } from "@utils/activity-utils";
import { invoiceCandidatesFromPaymentAmount } from "@utils/invoice-utils";
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

const generateNestedWriteForActivities = (
	activitiesToCreate: InvoiceSchema["activitiesToCreate"],
	client: Client,
	ownerId: string
) => ({
	data: activitiesToCreate.flatMap(({ supportItemId, activities }) =>
		activities.map((activity) => ({
			...activity,
			date: dayjs.utc(activity.date, "YYYY-MM-DD").toDate(),
			startTime: dayjs.utc(activity.startTime, "HH:mm").toDate(),
			endTime: dayjs.utc(activity.endTime, "HH:mm").toDate(),
			clientId: client.id,
			transitDistance: client.defaultTransitDistance ?? undefined,
			transitDuration: client.defaultTransitTime ?? undefined,
			supportItemId,
			ownerId,
		}))
	),
});

const generateNestedWriteForGroupActivities = (
	activitiesToCreate: InvoiceSchema["activitiesToCreate"],
	ownerId: string,
	clients: Client[]
) => ({
	data: activitiesToCreate.flatMap(
		({ supportItemId, groupClientId, activities }) => {
			const client = clients.find((c) => c.id === groupClientId);

			return activities.map((activity) => ({
				...activity,
				supportItemId,
				date: dayjs.utc(activity.date, "YYYY-MM-DD").toDate(),
				startTime: dayjs.utc(activity.startTime, "HH:mm").toDate(),
				endTime: dayjs.utc(activity.endTime, "HH:mm").toDate(),
				clientId: groupClientId,
				transitDistance: client?.defaultTransitDistance ?? undefined,
				transitDuration: client?.defaultTransitTime ?? undefined,
				ownerId,
			}));
		}
	),
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
						status: "asc",
					},
					{
						createdAt: "desc",
					},
				],
			});

			let nextCursor: typeof cursor | undefined;
			if (invoices.length > limit) {
				const nextInvoice = invoices.pop();
				nextCursor = nextInvoice?.id;
			}

			return {
				invoices: invoices.map((invoice) => parseInvoice(invoice)),
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
					sentAt: true,
					paidAt: true,
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

			const client = await ctx.prisma.client.findUnique({
				where: { id: inputInvoice.clientId },
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Can't find that client",
				});
			}

			const invoice = await ctx.prisma.invoice.create({
				data: {
					invoiceNo: inputInvoice.invoiceNo,
					billTo: inputInvoice.billTo,
					clientId: inputInvoice.clientId,
					date: inputInvoice.date
						? dayjs.utc(inputInvoice.date).toDate()
						: new Date(),
					ownerId: ctx.session.user.id,
					activities: {
						connect: inputInvoice.activityIds?.map((id) => ({ id })),
						createMany: generateNestedWriteForActivities(
							inputInvoice.activitiesToCreate,
							client,
							ctx.session.user.id
						),
					},
				},
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const groupActivitiesToCreate = inputInvoice.activitiesToCreate.filter(
				(activity) => activity.groupClientId
			);
			if (groupActivitiesToCreate) {
				const groupClientIds = groupActivitiesToCreate.map(
					(activity) => activity.groupClientId
				);

				const clients = await ctx.prisma.client.findMany({
					where: {
						id: {
							in: groupClientIds,
						},
					},
				});

				await ctx.prisma.activity.createMany(
					generateNestedWriteForGroupActivities(
						groupActivitiesToCreate,
						ctx.session.user.id,
						clients
					)
				);
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
			const { id, invoice: inputInvoice } = input;

			const client = await ctx.prisma.client.findUnique({
				where: { id: inputInvoice.clientId },
			});

			const invoice = await ctx.prisma.invoice.update({
				where: {
					id,
				},
				data: {
					invoiceNo: inputInvoice.invoiceNo,
					billTo: inputInvoice.billTo,
					clientId: inputInvoice.clientId,
					date: inputInvoice.date
						? dayjs.utc(inputInvoice.date).toDate()
						: new Date(),
					activities: {
						connect: inputInvoice.activityIds?.map((id) => ({ id })),
						createMany:
							inputInvoice.activitiesToCreate && client
								? generateNestedWriteForActivities(
										inputInvoice.activitiesToCreate,
										client,
										ctx.session.user.id
									)
								: undefined,
					},
				},
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
		.input(
			z.object({
				ids: z.array(z.string()),
				status: z.nativeEnum(InvoiceStatus),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { ids, status } = input;

			let sentAt: Date | null | undefined;
			let paidAt: Date | null | undefined;

			if (status === InvoiceStatus.CREATED) {
				sentAt = null;
				paidAt = null;
			} else if (status === InvoiceStatus.SENT) {
				sentAt = new Date();
			} else {
				paidAt = new Date();
			}

			const payload = await ctx.prisma.invoice.updateMany({
				where: {
					id: {
						in: ids,
					},
				},
				data: {
					status,
					sentAt,
					paidAt,
				},
			});

			return payload;
		}),
	matchByPayment: authedProcedure
		.input(z.object({ paymentAmount: z.number() }))
		.query(async ({ ctx, input }) => {
			const { paymentAmount } = input;

			const invoices = await ctx.prisma.invoice.findMany({
				where: {
					status: "SENT",
					activities: {
						some: {
							id: {},
						},
					},
				},
				select: {
					id: true,
					invoiceNo: true,
					date: true,
					client: {
						select: {
							name: true,
						},
					},
					activities: {
						include: {
							supportItem: true,
						},
					},
				},
			});

			if (invoices.length === 0) {
				return {
					invoiceIds: [],
					invoiceDetails: [],
				};
			}

			// Convert array of invoices to map of <total, invoiceId>
			const totals = new Map<number, string | string[]>();
			for (const invoice of invoices) {
				const total = getTotalCostOfActivities(invoice.activities);

				if (totals.has(total)) {
					const val = totals.get(total) as string | string[];

					Array.isArray(val)
						? val.push(invoice.id)
						: totals.set(total, [val, invoice.id]);
				} else {
					totals.set(total, invoice.id);
				}
			}

			const invoiceIds = invoiceCandidatesFromPaymentAmount(
				paymentAmount,
				totals
			);

			const invoiceDetails = invoices.filter((invoice) =>
				invoiceIds.flat(2).includes(invoice.id)
			);

			return {
				invoiceIds,
				invoiceDetails,
			};
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
>["list"];

export type InvoiceByIdOutput = inferRouterOutputs<
	typeof invoiceRouter
>["byId"];
