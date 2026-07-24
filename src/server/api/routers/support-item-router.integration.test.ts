import { Prisma } from "@/generated/client";
import prisma from "@/server/prisma";
import superjson from "superjson";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "../test/harness";

beforeEach(async () => {
	await resetDb();
});

async function createSupportItem(ownerId: string, weekdayRate = 100) {
	return prisma.supportItem.create({
		data: {
			description: "Standard Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate,
			ownerId
		}
	});
}

test("addCustomRates then getCustomRatesForClient returns the rate with the support item description", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const supportItem = await createSupportItem(user.id);
	const client = await caller.clients.create({ client: { name: "Jane" } });

	await caller.supportItem.addCustomRates({
		supportItemRates: {
			supportItemId: supportItem.id,
			clientId: client.id,
			weekdayRate: 200
		}
	});

	const rates = await caller.supportItem.getCustomRatesForClient({
		id: client.id
	});
	expect(rates).toHaveLength(1);
	expect(rates[0].supportItemId).toBe(supportItem.id);
	expect(Number(rates[0].weekdayRate)).toBe(200);
	expect(rates[0].supportItem).toEqual({
		description: supportItem.description
	});
});

test("updateCustomRate with a partial payload updates only the provided fields", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const supportItem = await createSupportItem(user.id);
	const client = await caller.clients.create({ client: { name: "Jane" } });

	const rate = await caller.supportItem.addCustomRates({
		supportItemRates: {
			supportItemId: supportItem.id,
			clientId: client.id,
			weekdayRate: 200,
			saturdayRate: 250
		}
	});

	await caller.supportItem.updateCustomRate({
		id: rate.id,
		supportItemRates: { weekdayRate: 300 }
	});

	const updated = await prisma.supportItemRates.findUniqueOrThrow({
		where: { id: rate.id }
	});
	expect(Number(updated.weekdayRate)).toBe(300);
	// The untouched field must survive - pins the `.partial()` semantics so a
	// regression that drops omitted fields on update is caught.
	expect(Number(updated.saturdayRate)).toBe(250);
});

test("updateCustomRate rejects another user's rate row with NOT_FOUND", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const supportItem = await createSupportItem(userA.id);
	const client = await callerA.clients.create({ client: { name: "Jane" } });
	const rate = await callerA.supportItem.addCustomRates({
		supportItemRates: {
			supportItemId: supportItem.id,
			clientId: client.id,
			weekdayRate: 200
		}
	});

	await expect(
		callerB.supportItem.updateCustomRate({
			id: rate.id,
			supportItemRates: { weekdayRate: 999 }
		})
	).rejects.toMatchObject({ code: "NOT_FOUND" });

	// A's rate is unchanged.
	const untouched = await prisma.supportItemRates.findUniqueOrThrow({
		where: { id: rate.id }
	});
	expect(Number(untouched.weekdayRate)).toBe(200);
});

test("a client's custom rate drives the invoice total over the support item default", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	// Default rate 100/hr; custom rate for this client 200/hr.
	const supportItem = await createSupportItem(user.id, 100);
	const client = await caller.clients.create({ client: { name: "Jane" } });
	await caller.supportItem.addCustomRates({
		supportItemRates: {
			supportItemId: supportItem.id,
			clientId: client.id,
			weekdayRate: 200
		}
	});

	// One-hour weekday activity (2024-01-01 is a Monday).
	const activity = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const invoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-1",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});

	const { invoices } = await caller.invoice.send({ ids: [invoice.id] });

	// 1 hour × custom 200/hr = 200, not the item's default 100.
	expect(invoices[0].versions![0].total).toBe(200);
});

// These are characterization tests: they pin the wire shape `supportItem.list`
// returns today (cursor contract + Decimal serialization) so the better-auth
// migration (#418), which reworks context/session, can't silently drift it.

test("supportItem.list cursor advances across pages without overlap or gaps", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	// Distinct createdAt values give the createdAt-desc list a stable order
	// (item-3, item-2, item-1) so the cursor round-trip is deterministic.
	const idByOrder: string[] = [];
	for (let i = 1; i <= 3; i++) {
		const created = await prisma.supportItem.create({
			data: {
				description: `Item ${i}`,
				weekdayCode: `01_001_0125_6_${i}`,
				weekdayRate: 100,
				ownerId: user.id,
				createdAt: new Date(`2024-01-0${i}T00:00:00.000Z`)
			}
		});
		idByOrder.push(created.id);
	}
	// createdAt desc => newest (item-3) first.
	const expectedOrder = [...idByOrder].reverse();

	const page1 = await caller.supportItem.list({ limit: 2 });
	expect(page1.supportItems).toHaveLength(2);
	expect(page1.nextCursor).toBeTypeOf("string");

	const page2 = await caller.supportItem.list({
		limit: 2,
		cursor: page1.nextCursor
	});
	expect(page2.supportItems).toHaveLength(1);
	expect(page2.nextCursor).toBeUndefined();

	// The two pages, concatenated, must equal the full seeded set in order: no
	// overlap (a repeated row would break the equality) and no gaps (a dropped
	// row would too). Oracle is the known seeding order, not another list() call.
	const ids = [...page1.supportItems, ...page2.supportItems].map((s) => s.id);
	expect(ids).toEqual(expectedOrder);
});

test("supportItem.list serializes Decimal fields in the current on-the-wire shape", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	// A fractional rate so the assertion pins Decimal (not integer) wire shape.
	await createSupportItem(user.id, 100.5);

	const { supportItems } = await caller.supportItem.list({ limit: 10 });
	const [supportItem] = supportItems;

	// The caller returns a Prisma.Decimal instance...
	expect(supportItem.weekdayRate).toBeInstanceOf(Prisma.Decimal);
	expect(supportItem.weekdayRate.toString()).toBe("100.5");

	// ...and superjson.stringify - exactly what the tRPC transformer puts on the
	// wire - renders the row's Decimal as a plain JSON string with no type tag
	// in meta.values. This pins the on-the-wire shape of the row; a regression
	// that boxed or re-typed the Decimal breaks here.
	const wire = JSON.parse(superjson.stringify(supportItem));
	expect(wire.json.weekdayRate).toBe("100.5");
	expect(wire.meta?.values ?? {}).not.toHaveProperty("weekdayRate");
});
