import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { invoiceCandidatesFromPaymentAmount } from "@/lib/invoice-utils";
import { baseListQueryInput } from "@/lib/trpc";
import { activitySchema } from "@/schema/activity-schema";
import {
	InvoiceSchema,
	invoiceSchema,
	totalGroupSize
} from "@/schema/invoice-schema";
import { ownedDb, paginate } from "@/server/api/owned";
import { authedProcedure, router } from "@/server/api/trpc";
import {
	Client,
	Invoice,
	InvoiceStatus,
	PrismaClient
} from "@/generated/client";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import dayjs from "dayjs";
import { z } from "zod";
import { DEFAULT_LIST_LIMIT } from "./router.constants";

const defaultInvoiceSelect = {
	id: true,
	billTo: true,
	invoiceNo: true,
	date: true,
	status: true,
	client: {
		select: { name: true, number: true, id: true, invoiceEmail: true }
	},
	activities: {
		select: {
			startTime: true,
			endTime: true,
			transitDistance: true,
			transitDuration: true,
			itemDistance: true,
			date: true,
			supportItem: true
		}
	}
};

export function parseInvoice<T extends Partial<Invoice>>(
	invoice: T
): Omit<T, "date"> & { date?: string } {
	return {
		...invoice,
		date: dayjs(invoice.date).format("YYYY-MM-DD")
	};
}

const generateNestedWriteForActivities = (
	activitiesToCreate: InvoiceSchema["activitiesToCreate"],
	client: Client,
	ownerId: string
) => ({
	data: activitiesToCreate.flatMap(
		({ supportItemId, groupClientIds, activities }) => {
			const groupSize =
				groupClientIds.length > 0 ? totalGroupSize(groupClientIds) : undefined;

			return activities.map((activity) => ({
				...activity,
				date: activity.date,
				startTime: dayjs.utc(activity.startTime, "HH:mm").toDate(),
				endTime: dayjs.utc(activity.endTime, "HH:mm").toDate(),
				clientId: client.id,
				transitDistance: client.distanceToClient ?? undefined,
				transitDuration: client.travelTimeToClient ?? undefined,
				supportItemId,
				groupSize,
				ownerId
			}));
		}
	)
});

const generateNestedWriteForGroupActivities = (
	activitiesToCreate: InvoiceSchema["activitiesToCreate"],
	ownerId: string,
	clients: Client[]
) => ({
	data: activitiesToCreate.flatMap(
		({ supportItemId, groupClientIds, activities }) => {
			const groupSize = totalGroupSize(groupClientIds);

			return groupClientIds.flatMap((groupClientId) => {
				const client = clients.find((c) => c.id === groupClientId);

				return activities.map((activity) => ({
					...activity,
					supportItemId,
					date: activity.date,
					startTime: dayjs.utc(activity.startTime, "HH:mm").toDate(),
					endTime: dayjs.utc(activity.endTime, "HH:mm").toDate(),
					clientId: groupClientId,
					transitDistance: client?.distanceToClient ?? undefined,
					transitDuration: client?.travelTimeToClient ?? undefined,
					groupSize,
					ownerId
				}));
			});
		}
	)
});

type GroupWriteCtx = {
	owned: ReturnType<typeof ownedDb>;
	prisma: PrismaClient;
};

/**
 * Guard: a group support item on a row with no other participants can't be
 * billed (its rate would divide by 1). Both create and modify enforce this.
 */
const assertGroupRowsHaveParticipants = async (
	owned: GroupWriteCtx["owned"],
	activitiesToCreate: InvoiceSchema["activitiesToCreate"]
) => {
	const soloRowSupportItemIds = [
		...new Set(
			activitiesToCreate
				.filter((activity) => activity.groupClientIds.length === 0)
				.map((activity) => activity.supportItemId)
		)
	];

	if (soloRowSupportItemIds.length === 0) return;

	const groupSupportItemsAmongSoloRows = await owned.supportItem.findMany({
		where: { id: { in: soloRowSupportItemIds }, isGroup: true },
		select: { id: true }
	});

	if (groupSupportItemsAmongSoloRows.length > 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Group activities require at least one other participant"
		});
	}
};

/**
 * Validate group rows and fan out one mirrored (pending) activity per other
 * participant. Shared by create and modify so the invoice edit flow — which
 * renders the same participant UI — can't persist a group primary with a
 * `groupSize` but no sibling activities.
 */
const createGroupMirrorActivities = async (
	ctx: GroupWriteCtx,
	inputInvoice: InvoiceSchema,
	ownerId: string
) => {
	const groupActivitiesToCreate = inputInvoice.activitiesToCreate.filter(
		(activity) => activity.groupClientIds.length > 0
	);

	if (groupActivitiesToCreate.length === 0) return;

	for (const activity of groupActivitiesToCreate) {
		if (
			new Set(activity.groupClientIds).size !== activity.groupClientIds.length
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Group participants must be distinct"
			});
		}

		if (activity.groupClientIds.includes(inputInvoice.clientId)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "The primary client cannot also be a group participant"
			});
		}
	}

	const allGroupClientIds = groupActivitiesToCreate.flatMap(
		(activity) => activity.groupClientIds
	);

	const clients = await ctx.owned.client.findMany({
		where: { id: { in: allGroupClientIds } }
	});

	if (clients.length !== new Set(allGroupClientIds).size) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "One or more group clients not found"
		});
	}

	await ctx.prisma.activity.createMany(
		generateNestedWriteForGroupActivities(
			groupActivitiesToCreate,
			ownerId,
			clients
		)
	);
};

export const invoiceRouter = router({
	list: authedProcedure
		.input(
			baseListQueryInput.extend({
				status: z.nativeEnum(InvoiceStatus).array().optional(),
				clientId: z.string().optional(),
				search: z.string().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			const limit = input.limit ?? DEFAULT_LIST_LIMIT;
			const { cursor, status, clientId, search } = input;

			const { items: invoices, nextCursor } = await paginate({
				limit,
				cursor,
				query: ({ take, cursor }) =>
					ctx.owned.invoice.findMany({
						select: {
							...defaultInvoiceSelect,
							_count: {
								select: { activities: true }
							}
						},
						take,
						where: {
							status: { in: status },
							clientId,
							...(search && {
								OR: [
									{ invoiceNo: { contains: search, mode: "insensitive" } },
									{
										client: { name: { contains: search, mode: "insensitive" } }
									}
								]
							})
						},
						cursor,
						orderBy: [
							{
								status: "asc"
							},
							{
								createdAt: "desc"
							}
						]
					})
			});

			return {
				invoices: invoices.map((invoice) => parseInvoice(invoice)),
				nextCursor
			};
		}),
	getTotalOwing: authedProcedure.query(async ({ ctx }) => {
		const invoices = await ctx.owned.invoice.findMany({
			select: {
				activities: {
					include: {
						supportItem: true,
						client: { select: { transitRatePerKm: true } }
					}
				}
			},
			where: {
				status: "SENT"
			}
		});

		const user = await ctx.prisma.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { transitRatePerKm: true }
		});
		const rateContext = {
			userTransitRatePerKm: Number(user?.transitRatePerKm ?? 0.99)
		};

		const totalOwing = invoices.reduce(
			(total, invoice) =>
				(total += getTotalCostOfActivities(invoice.activities, rateContext)),
			0
		);

		return totalOwing;
	}),
	byId: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const invoice = await ctx.owned.invoice.findFirst({
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
							supportItemId: true
						}
					}
				},
				where: {
					id: input.id
				}
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return parseInvoice(invoice);
		}),
	create: authedProcedure
		.input(
			z.object({
				invoice: invoiceSchema
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { invoice: inputInvoice } = input;

			const client = await ctx.owned.client.findFirst({
				where: { id: inputInvoice.clientId }
			});

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Can't find that client"
				});
			}

			if (inputInvoice.activityIds && inputInvoice.activityIds.length > 0) {
				await ctx.owned.activity.assertAll(
					inputInvoice.activityIds,
					"One or more activities not found"
				);
			}

			await assertGroupRowsHaveParticipants(
				ctx.owned,
				inputInvoice.activitiesToCreate
			);

			const invoice = await ctx.prisma.invoice.create({
				data: {
					invoiceNo: inputInvoice.invoiceNo,
					billTo: inputInvoice.billTo,
					clientId: inputInvoice.clientId,
					date: inputInvoice.date ? inputInvoice.date : new Date(),
					ownerId: ctx.session.user.id,
					activities: {
						connect: inputInvoice.activityIds?.map((id) => ({ id })),
						createMany: generateNestedWriteForActivities(
							inputInvoice.activitiesToCreate,
							client,
							ctx.session.user.id
						)
					}
				}
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			await createGroupMirrorActivities(ctx, inputInvoice, ctx.session.user.id);

			return parseInvoice(invoice);
		}),
	modify: authedProcedure
		.input(
			z.object({
				id: z.string(),
				invoice: invoiceSchema,
				activities: z.array(activitySchema).optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, invoice: inputInvoice } = input;

			await ctx.owned.invoice.assert(id);

			const client = await ctx.owned.client.findFirst({
				where: { id: inputInvoice.clientId }
			});

			if (inputInvoice.activityIds && inputInvoice.activityIds.length > 0) {
				await ctx.owned.activity.assertAll(
					inputInvoice.activityIds,
					"One or more activities not found"
				);
			}

			if (client) {
				await assertGroupRowsHaveParticipants(
					ctx.owned,
					inputInvoice.activitiesToCreate
				);
			}

			const invoice = await ctx.prisma.invoice.update({
				where: {
					id
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
								: undefined
					}
				},
				select: {
					date: true,
					invoiceNo: true
				}
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (client) {
				await createGroupMirrorActivities(
					ctx,
					inputInvoice,
					ctx.session.user.id
				);
			}

			return {
				invoice: parseInvoice(invoice)
			};
		}),
	updateStatus: authedProcedure
		.input(
			z.object({
				ids: z.array(z.string()),
				status: z.nativeEnum(InvoiceStatus)
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

			const payload = await ctx.owned.invoice.updateMany({
				where: {
					id: {
						in: ids
					}
				},
				data: {
					status,
					sentAt,
					paidAt
				}
			});

			return payload;
		}),
	matchByPayment: authedProcedure
		.input(z.object({ paymentAmount: z.number() }))
		.query(async ({ ctx, input }) => {
			const { paymentAmount } = input;

			const invoices = await ctx.owned.invoice.findMany({
				where: {
					status: "SENT",
					activities: {
						some: {
							id: {}
						}
					}
				},
				select: {
					id: true,
					invoiceNo: true,
					date: true,
					client: {
						select: {
							name: true
						}
					},
					activities: {
						include: {
							supportItem: true,
							client: { select: { transitRatePerKm: true } }
						}
					}
				}
			});

			if (invoices.length === 0) {
				return {
					invoiceIds: [],
					invoiceDetails: []
				};
			}

			const user = await ctx.prisma.user.findUnique({
				where: { id: ctx.session.user.id },
				select: { transitRatePerKm: true }
			});
			const rateContext = {
				userTransitRatePerKm: Number(user?.transitRatePerKm ?? 0.99)
			};

			// Convert array of invoices to map of <total, invoiceId>
			const totals = new Map<number, string | string[]>();
			for (const invoice of invoices) {
				const total = getTotalCostOfActivities(invoice.activities, rateContext);

				if (totals.has(total)) {
					const val = totals.get(total) as string | string[];

					if (Array.isArray(val)) {
						val.push(invoice.id);
					} else {
						totals.set(total, [val, invoice.id]);
					}
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
				invoiceDetails
			};
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.invoice.assert(input.id);

			const invoice = await ctx.prisma.invoice.delete({
				where: {
					id: input.id
				}
			});

			if (!invoice) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return {};
		})
});

export type InvoiceListOutput = inferRouterOutputs<
	typeof invoiceRouter
>["list"]["invoices"][0];

export type InvoiceByIdOutput = inferRouterOutputs<
	typeof invoiceRouter
>["byId"];
