import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "@/generated/client";

// Reviewer sweep: after routers are migrated onto this module, no raw
// ctx.prisma.<tenant-model>.* calls should remain in the four migrated
// routers except:
//   - `create` (ownerId is set directly in `data`)
//   - nested writes under an already-asserted parent (e.g.
//     ActivityTransportItem rows under an asserted Activity)
//   - the `update`/`delete` immediately following a `ctx.owned.<model>.assert(id)`
//     pre-check — Prisma can't scope a unique `where` by ownerId, so the
//     assert is the scoping and the mutation itself stays raw, by id only
// Run:
//   grep -n "ctx\.prisma\.\(client\|invoice\|activity\|supportItem\|supportItemRates\)\." \
//     src/server/api/routers/{invoice,activity,client,support-item}-router.ts

function notFound(message?: string): never {
	throw new TRPCError({ code: "NOT_FOUND", message });
}

function ownedClient(prisma: PrismaClient, ownerId: string) {
	const model = prisma.client;

	return {
		findMany<T extends Prisma.ClientFindManyArgs>(args?: T) {
			return model.findMany({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.ClientFindManyArgs>);
		},
		findFirst<T extends Prisma.ClientFindFirstArgs>(args?: T) {
			return model.findFirst({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.ClientFindFirstArgs>);
		},
		async assert(id: string) {
			const record = await model.findFirst({
				where: { id, ownerId },
				select: { id: true }
			});
			if (!record) notFound();
			return record;
		}
	};
}

function ownedInvoice(prisma: PrismaClient, ownerId: string) {
	const model = prisma.invoice;

	return {
		findMany<T extends Prisma.InvoiceFindManyArgs>(args?: T) {
			return model.findMany({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.InvoiceFindManyArgs>);
		},
		findFirst<T extends Prisma.InvoiceFindFirstArgs>(args?: T) {
			return model.findFirst({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.InvoiceFindFirstArgs>);
		},
		updateMany<T extends Prisma.InvoiceUpdateManyArgs>(args: T) {
			return model.updateMany({
				...args,
				where: { ...args.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.InvoiceUpdateManyArgs>);
		},
		async assert(id: string) {
			const record = await model.findFirst({
				where: { id, ownerId },
				select: { id: true }
			});
			if (!record) notFound();
			return record;
		}
	};
}

function ownedActivity(prisma: PrismaClient, ownerId: string) {
	const model = prisma.activity;

	return {
		findMany<T extends Prisma.ActivityFindManyArgs>(args?: T) {
			return model.findMany({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.ActivityFindManyArgs>);
		},
		findFirst<T extends Prisma.ActivityFindFirstArgs>(args?: T) {
			return model.findFirst({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.ActivityFindFirstArgs>);
		},
		async assert(id: string) {
			const record = await model.findFirst({
				where: { id, ownerId },
				select: { id: true }
			});
			if (!record) notFound();
			return record;
		},
		async assertAll(ids: string[], message?: string) {
			const records = await model.findMany({
				where: { id: { in: ids }, ownerId },
				select: { id: true }
			});
			if (records.length !== ids.length) notFound(message);
			return records;
		}
	};
}

function ownedSupportItem(prisma: PrismaClient, ownerId: string) {
	const model = prisma.supportItem;

	return {
		findMany<T extends Prisma.SupportItemFindManyArgs>(args?: T) {
			return model.findMany({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.SupportItemFindManyArgs>);
		},
		findFirst<T extends Prisma.SupportItemFindFirstArgs>(args?: T) {
			return model.findFirst({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.SupportItemFindFirstArgs>);
		},
		async assert(id: string) {
			const record = await model.findFirst({
				where: { id, ownerId },
				select: { id: true }
			});
			if (!record) notFound();
			return record;
		}
	};
}

function ownedSupportItemRates(prisma: PrismaClient, ownerId: string) {
	const model = prisma.supportItemRates;

	return {
		findMany<T extends Prisma.SupportItemRatesFindManyArgs>(args?: T) {
			return model.findMany({
				...args,
				where: { ...args?.where, ownerId }
			} as Prisma.SelectSubset<T, Prisma.SupportItemRatesFindManyArgs>);
		},
		async assert(id: string) {
			const record = await model.findFirst({
				where: { id, ownerId },
				select: { id: true }
			});
			if (!record) notFound();
			return record;
		}
	};
}

export function ownedDb(prisma: PrismaClient, ownerId: string) {
	return {
		client: ownedClient(prisma, ownerId),
		invoice: ownedInvoice(prisma, ownerId),
		activity: ownedActivity(prisma, ownerId),
		supportItem: ownedSupportItem(prisma, ownerId),
		supportItemRates: ownedSupportItemRates(prisma, ownerId)
	};
}

export async function paginate<T extends { id: string }>(params: {
	query: (page: { take: number; cursor?: { id: string } }) => Promise<T[]>;
	limit: number;
	cursor?: string;
}): Promise<{ items: T[]; nextCursor?: string }> {
	const { query, limit, cursor } = params;

	const items = await query({
		take: limit + 1,
		cursor: cursor ? { id: cursor } : undefined
	});

	let nextCursor: string | undefined;
	if (items.length > limit) {
		const next = items.pop();
		nextCursor = next?.id;
	}

	return { items, nextCursor };
}
