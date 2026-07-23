import prisma from "@/server/prisma";
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
