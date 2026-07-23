import {
	displayInvoiceNo,
	invoiceCandidatesFromPaymentAmount
} from "@/lib/invoice-utils";
import { buildInvoiceVersionContent } from "@/lib/invoice-version";
import { loadInvoiceForPdf } from "@/lib/pdf-generation";
import { baseListQueryInput } from "@/lib/trpc";
import { activitySchema } from "@/schema/activity-schema";
import {
	InvoiceSchema,
	invoiceSchema,
	totalGroupSize
} from "@/schema/invoice-schema";
import { amendFirst, ownedDb, paginate } from "@/server/api/owned";
import { authedProcedure, router } from "@/server/api/trpc";
import {
	Client,
	Invoice,
	InvoiceStatus,
	PrismaClient,
	type Prisma
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

const versionSelect = {
	versionNumber: true,
	sentAt: true,
	paidAt: true,
	total: true,
	content: true
} satisfies Prisma.InvoiceVersionSelect;

// The version rows every status transition returns to its UI caller, newest
// first. Shared so `send`/`amend`/`markPaid`/`unmarkPaid` can't drift apart.
const versionInclude = {
	versions: {
		select: versionSelect,
		orderBy: { versionNumber: "desc" }
	}
} satisfies Prisma.InvoiceInclude;

type VersionRow = {
	versionNumber: number;
	sentAt: Date;
	paidAt: Date | null;
	total: Prisma.Decimal;
	content: Prisma.JsonValue;
};

function parseVersion(invoiceNo: string, version: VersionRow) {
	const content =
		version.content && typeof version.content === "object"
			? (version.content as { backfilled?: boolean })
			: undefined;

	return {
		versionNumber: version.versionNumber,
		displayInvoiceNo: displayInvoiceNo(invoiceNo, version.versionNumber),
		sentAt: version.sentAt,
		paidAt: version.paidAt,
		total: Number(version.total),
		backfilled: content?.backfilled === true
	};
}

export function parseInvoice<
	T extends Partial<Invoice> & { versions?: VersionRow[] }
>(invoice: T) {
	const { versions, ...rest } = invoice;

	return {
		...rest,
		date: dayjs(invoice.date).format("YYYY-MM-DD"),
		...(versions && {
			versions: versions
				.slice()
				.sort((a, b) => b.versionNumber - a.versionNumber)
				.map((version) => parseVersion(invoice.invoiceNo ?? "", version))
		})
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

type RouterCtx = {
	owned: ReturnType<typeof ownedDb>;
	prisma: PrismaClient;
};

/**
 * Guard: a group support item on a row with no other participants can't be
 * billed (its rate would divide by 1). Both create and modify enforce this.
 */
const assertGroupRowsHaveParticipants = async (
	owned: RouterCtx["owned"],
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
 * Guard: every supportItemId in activitiesToCreate must belong to the caller
 * before it's persisted onto an Activity row.
 */
const assertSupportItemsOwned = async (
	owned: RouterCtx["owned"],
	activitiesToCreate: InvoiceSchema["activitiesToCreate"]
) => {
	const supportItemIds = [
		...new Set(activitiesToCreate.map((activity) => activity.supportItemId))
	];

	await Promise.all(supportItemIds.map((id) => owned.supportItem.assert(id)));
};

/**
 * Validate group rows and fan out one mirrored (pending) activity per other
 * participant. Shared by create and modify so the invoice edit flow — which
 * renders the same participant UI — can't persist a group primary with a
 * `groupSize` but no sibling activities.
 */
const createGroupMirrorActivities = async (
	ctx: RouterCtx,
	db: Prisma.TransactionClient,
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

	await db.activity.createMany(
		generateNestedWriteForGroupActivities(
			groupActivitiesToCreate,
			ownerId,
			clients
		)
	);
};

/**
 * Shared scaffolding for the bulk id-list transitions (`send`, `markPaid`,
 * `unmarkPaid`): per id, assert ownership, run `work` in its own transaction,
 * and return the parsed invoices. Each transition supplies only its inner
 * transactional body.
 */
async function transitionInvoices<
	T extends Partial<Invoice> & { versions?: VersionRow[] }
>(
	ctx: RouterCtx,
	ids: string[],
	work: (tx: Prisma.TransactionClient, id: string) => Promise<T>
) {
	const invoices: T[] = [];

	for (const id of ids) {
		await ctx.owned.invoice.assert(id);
		invoices.push(await ctx.prisma.$transaction((tx) => work(tx, id)));
	}

	return { invoices: invoices.map((invoice) => parseInvoice(invoice)) };
}

/**
 * `markPaid` / `unmarkPaid`: both re-check the source status, stamp (or clear)
 * `paidAt` on the invoice and its latest version, and flip the status. They
 * differ only in the required source status, the target status, the `paidAt`
 * value, and the conflict message.
 */
function setPaidState(
	ctx: RouterCtx,
	ids: string[],
	opts: {
		from: InvoiceStatus;
		to: InvoiceStatus;
		paidAt: Date | null;
		conflictMessage: (invoiceNo: string) => string;
	}
) {
	return transitionInvoices(ctx, ids, async (tx, id) => {
		const existing = await tx.invoice.findUniqueOrThrow({ where: { id } });

		if (existing.status !== opts.from) {
			throw new TRPCError({
				code: "CONFLICT",
				message: opts.conflictMessage(existing.invoiceNo)
			});
		}

		const latestVersion = await tx.invoiceVersion.findFirst({
			where: { invoiceId: id },
			orderBy: { versionNumber: "desc" }
		});

		if (latestVersion) {
			await tx.invoiceVersion.update({
				where: { id: latestVersion.id },
				data: { paidAt: opts.paidAt }
			});
		}

		return tx.invoice.update({
			where: { id },
			data: { status: opts.to, paidAt: opts.paidAt },
			include: versionInclude
		});
	});
}

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
							},
							versions: {
								select: versionSelect,
								orderBy: { versionNumber: "desc" },
								take: 1
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
	// Sums the latest version's frozen total for each SENT invoice — not a
	// live recompute — so a post-send rate/catalogue edit can't move an
	// amount already owed.
	getTotalOwing: authedProcedure.query(async ({ ctx }) => {
		const invoices = await ctx.owned.invoice.findMany({
			select: {
				versions: {
					select: { total: true },
					orderBy: { versionNumber: "desc" },
					take: 1
				}
			},
			where: {
				status: "SENT"
			}
		});

		return invoices.reduce(
			(total, invoice) => total + Number(invoice.versions[0]?.total ?? 0),
			0
		);
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
					},
					versions: {
						select: versionSelect,
						orderBy: { versionNumber: "desc" }
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
				// `connect` below would silently reassign an activity away from
				// whatever invoice currently holds it.
				await ctx.owned.activity.assertNoneOnLockedInvoice(
					inputInvoice.activityIds
				);
			}

			await assertSupportItemsOwned(ctx.owned, inputInvoice.activitiesToCreate);

			await assertGroupRowsHaveParticipants(
				ctx.owned,
				inputInvoice.activitiesToCreate
			);

			const invoice = await ctx.prisma.$transaction(async (tx) => {
				const invoice = await tx.invoice.create({
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

				await createGroupMirrorActivities(
					ctx,
					tx,
					inputInvoice,
					ctx.session.user.id
				);

				return invoice;
			});

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

			await ctx.owned.invoice.assertUnlocked(id);

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
				// `connect` below would silently reassign an activity away from
				// whatever invoice currently holds it.
				await ctx.owned.activity.assertNoneOnLockedInvoice(
					inputInvoice.activityIds
				);
			}

			await assertSupportItemsOwned(ctx.owned, inputInvoice.activitiesToCreate);

			await assertGroupRowsHaveParticipants(
				ctx.owned,
				inputInvoice.activitiesToCreate
			);

			const invoice = await ctx.prisma.$transaction(async (tx) => {
				const invoice = await tx.invoice.update({
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
							createMany: inputInvoice.activitiesToCreate
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

				await createGroupMirrorActivities(
					ctx,
					tx,
					inputInvoice,
					ctx.session.user.id
				);

				return invoice;
			});

			return {
				invoice: parseInvoice(invoice)
			};
		}),
	send: authedProcedure
		.input(z.object({ ids: z.array(z.string()) }))
		.mutation(({ ctx, input }) =>
			transitionInvoices(ctx, input.ids, async (tx, id) => {
				const existing = await tx.invoice.findUniqueOrThrow({ where: { id } });

				if (existing.status !== InvoiceStatus.CREATED) {
					amendFirst(existing.invoiceNo);
				}

				const data = await loadInvoiceForPdf(id, ctx.session.user.id, tx);

				if (!data || data.invoice.activities.length === 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invoice has no activities"
					});
				}

				const previousVersion = await tx.invoiceVersion.findFirst({
					where: { invoiceId: id },
					orderBy: { versionNumber: "desc" }
				});
				const versionNumber = (previousVersion?.versionNumber ?? 0) + 1;
				const previousDisplayInvoiceNo = previousVersion
					? displayInvoiceNo(existing.invoiceNo, previousVersion.versionNumber)
					: undefined;

				const content = buildInvoiceVersionContent(data, {
					versionNumber,
					previousDisplayInvoiceNo
				});

				const sentAt = new Date();

				await tx.invoiceVersion.create({
					data: {
						invoiceId: id,
						versionNumber,
						sentAt,
						total: content.total,
						content
					}
				});

				return tx.invoice.update({
					where: { id },
					data: { status: InvoiceStatus.SENT, sentAt },
					include: versionInclude
				});
			})
		),
	amend: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.invoice.assert(input.id);

			const existing = await ctx.prisma.invoice.findUniqueOrThrow({
				where: { id: input.id }
			});

			if (existing.status === InvoiceStatus.CREATED) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Invoice is already a draft"
				});
			}

			const invoice = await ctx.prisma.invoice.update({
				where: { id: input.id },
				data: {
					status: InvoiceStatus.CREATED,
					sentAt: null,
					paidAt: null
				},
				include: versionInclude
			});

			return parseInvoice(invoice);
		}),
	// Drops the most recent version outright, rather than amend+resend which
	// would burn its number and push the next send to a further suffix. Deleting
	// the sole version leaves the invoice as if it was never sent — recovering an
	// accidental send.
	deleteVersion: authedProcedure
		.input(z.object({ id: z.string(), versionNumber: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.invoice.assert(input.id);

			const invoice = await ctx.prisma.$transaction(async (tx) => {
				const existing = await tx.invoice.findUniqueOrThrow({
					where: { id: input.id }
				});

				const latest = await tx.invoiceVersion.findFirst({
					where: { invoiceId: input.id },
					orderBy: { versionNumber: "desc" }
				});

				if (!latest) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Invoice has no versions"
					});
				}

				// Only the latest version can be dropped: deleting an earlier one
				// would leave a gap and misalign every later version's suffix.
				if (latest.versionNumber !== input.versionNumber) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Only the latest version can be deleted"
					});
				}

				await tx.invoiceVersion.delete({ where: { id: latest.id } });

				const remaining = await tx.invoiceVersion.findFirst({
					where: { invoiceId: input.id },
					orderBy: { versionNumber: "desc" }
				});

				// No versions left → revert to a draft, as if never sent. Otherwise
				// re-adopt the new latest version's sent/paid state — unless the
				// invoice is already being re-drafted (amended), in which case its
				// own draft status stands.
				const data =
					remaining === null
						? {
								status: InvoiceStatus.CREATED,
								sentAt: null,
								paidAt: null
							}
						: existing.status === InvoiceStatus.CREATED
							? {}
							: {
									status: remaining.paidAt
										? InvoiceStatus.PAID
										: InvoiceStatus.SENT,
									sentAt: remaining.sentAt,
									paidAt: remaining.paidAt
								};

				return tx.invoice.update({
					where: { id: input.id },
					data,
					include: versionInclude
				});
			});

			return parseInvoice(invoice);
		}),
	markPaid: authedProcedure
		.input(z.object({ ids: z.array(z.string()) }))
		.mutation(({ ctx, input }) =>
			setPaidState(ctx, input.ids, {
				from: InvoiceStatus.SENT,
				to: InvoiceStatus.PAID,
				paidAt: new Date(),
				conflictMessage: (invoiceNo) => `Invoice ${invoiceNo} is not sent`
			})
		),
	unmarkPaid: authedProcedure
		.input(z.object({ ids: z.array(z.string()) }))
		.mutation(({ ctx, input }) =>
			setPaidState(ctx, input.ids, {
				from: InvoiceStatus.PAID,
				to: InvoiceStatus.SENT,
				paidAt: null,
				conflictMessage: (invoiceNo) => `Invoice ${invoiceNo} is not paid`
			})
		),
	// Keys candidates on each invoice's latest version's frozen total, not a
	// live recompute.
	matchByPayment: authedProcedure
		.input(z.object({ paymentAmount: z.number() }))
		.query(async ({ ctx, input }) => {
			const { paymentAmount } = input;

			const invoices = await ctx.owned.invoice.findMany({
				where: {
					status: "SENT"
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
					versions: {
						select: { total: true },
						orderBy: { versionNumber: "desc" },
						take: 1
					}
				}
			});

			if (invoices.length === 0) {
				return {
					invoiceIds: [],
					invoiceDetails: []
				};
			}

			// Convert array of invoices to map of <total, invoiceId>
			const totals = new Map<number, string | string[]>();
			for (const invoice of invoices) {
				const total = Number(invoice.versions[0]?.total ?? 0);

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

			const invoiceDetails = invoices
				.filter((invoice) => invoiceIds.flat(2).includes(invoice.id))
				.map((invoice) => ({
					id: invoice.id,
					invoiceNo: invoice.invoiceNo,
					date: invoice.date,
					client: invoice.client,
					total: Number(invoice.versions[0]?.total ?? 0)
				}));

			return {
				invoiceIds,
				invoiceDetails
			};
		}),
	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.invoice.assert(input.id);

			const versionCount = await ctx.prisma.invoiceVersion.count({
				where: { invoiceId: input.id }
			});
			if (versionCount > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Invoice has been sent and can't be deleted"
				});
			}

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
