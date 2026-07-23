import prisma from "@/server/prisma";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "../test/harness";

beforeEach(async () => {
	await resetDb();
});

const PROFILE = {
	name: "Provider Name",
	abn: 12_345_678_901,
	bankName: "Test Bank",
	bankNumber: 12_345_678,
	bsb: 123_456
};

function createSupportItem(ownerId: string, description = "Support") {
	return prisma.supportItem.create({
		data: {
			description,
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 100,
			ownerId
		}
	});
}

test("update then fetch round-trips the profile and bank fields", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	await caller.user.update({ user: PROFILE });

	const fetched = await caller.user.fetch();
	expect(fetched.name).toBe(PROFILE.name);
	expect(Number(fetched.abn)).toBe(PROFILE.abn);
	expect(fetched.bankName).toBe(PROFILE.bankName);
	expect(Number(fetched.bankNumber)).toBe(PROFILE.bankNumber);
	expect(fetched.bsb).toBe(PROFILE.bsb);
});

test("getBankDetails returns exactly the payment fields and never another user's", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	await callerA.user.update({ user: PROFILE });

	const details = await callerA.user.getBankDetails();
	expect(Object.keys(details).sort()).toEqual([
		"abn",
		"bankName",
		"bankNumber",
		"bsb",
		"name"
	]);
	expect(details.name).toBe(PROFILE.name);
	expect(Number(details.abn)).toBe(PROFILE.abn);
	expect(Number(details.bankNumber)).toBe(PROFILE.bankNumber);
	expect(details.bankName).toBe(PROFILE.bankName);
	expect(details.bsb).toBe(PROFILE.bsb);

	// User B never set any details, and A's details must not leak across.
	const detailsB = await callerB.user.getBankDetails();
	expect(detailsB).toEqual({
		name: userB.name,
		abn: null,
		bankNumber: null,
		bankName: null,
		bsb: null
	});
});

test("reset clears all owned data and nulls the profile, leaving other users untouched", async () => {
	const owner = await createTestUser();
	const caller = callerFor(owner);
	await caller.user.update({ user: PROFILE });

	const other = await createTestUser();
	const otherCaller = callerFor(other);

	const supportItem = await createSupportItem(owner.id);
	const client = await caller.clients.create({ client: { name: "Jane" } });
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
	// An unsent (CREATED) invoice - deletable, so it actually exercises the
	// cascade rather than leaving the Invoice assertion vacuous.
	await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-1",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});

	// Another user's data, to prove reset is owner-scoped.
	const otherSupportItem = await createSupportItem(other.id, "Other Support");
	const otherClient = await otherCaller.clients.create({
		client: { name: "Other Client" }
	});
	await otherCaller.activity.add({
		activity: {
			clientId: otherClient.id,
			supportItemId: otherSupportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});

	await caller.user.reset();

	expect(await prisma.client.count({ where: { ownerId: owner.id } })).toBe(0);
	expect(await prisma.invoice.count({ where: { ownerId: owner.id } })).toBe(0);
	expect(await prisma.activity.count({ where: { ownerId: owner.id } })).toBe(0);
	expect(await prisma.supportItem.count({ where: { ownerId: owner.id } })).toBe(
		0
	);

	const nulled = await prisma.user.findUniqueOrThrow({
		where: { id: owner.id }
	});
	expect(nulled.abn).toBeNull();
	expect(nulled.name).toBeNull();
	expect(nulled.bankName).toBeNull();
	expect(nulled.bankNumber).toBeNull();
	expect(nulled.bsb).toBeNull();

	// The other user is untouched.
	expect(await prisma.client.count({ where: { ownerId: other.id } })).toBe(1);
	expect(await prisma.activity.count({ where: { ownerId: other.id } })).toBe(1);
	expect(await prisma.supportItem.count({ where: { ownerId: other.id } })).toBe(
		1
	);
});

// Characterization (see issue #408): a sent invoice makes reset's first
// `client.deleteMany` cascade into Invoice and hit the ADR-0004
// `InvoiceVersion` onDelete: Restrict. That single Postgres DELETE statement
// rolls back whole, so nothing is deleted - not even the unrelated clean
// client - and the profile-nulling never runs. It's a safe atomic no-op, but
// it leaks a raw Prisma FK error to the caller (follow-up: return a clear
// TRPCError instead).
test("reset atomically no-ops when a sent invoice exists (fails on the first deleteMany, nothing is deleted)", async () => {
	const owner = await createTestUser();
	const caller = callerFor(owner);
	await caller.user.update({ user: PROFILE });

	// Client 1: has a sent invoice (the reset blocker).
	const sentSupportItem = await createSupportItem(owner.id, "Sent Support");
	const sentClient = await caller.clients.create({ client: { name: "Sent" } });
	const sentActivity = await caller.activity.add({
		activity: {
			clientId: sentClient.id,
			supportItemId: sentSupportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const sentInvoice = await caller.invoice.create({
		invoice: {
			clientId: sentClient.id,
			invoiceNo: "INV-1",
			activityIds: [sentActivity.id],
			activitiesToCreate: []
		}
	});
	await caller.invoice.send({ ids: [sentInvoice.id] });

	// Client 2: entirely clean, with its own support item and activity - its
	// survival proves all-or-nothing.
	const cleanSupportItem = await createSupportItem(owner.id, "Clean Support");
	const cleanClient = await caller.clients.create({
		client: { name: "Clean" }
	});
	const cleanActivity = await caller.activity.add({
		activity: {
			clientId: cleanClient.id,
			supportItemId: cleanSupportItem.id,
			date: new Date("2024-01-02"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});

	await expect(caller.user.reset()).rejects.toThrow();

	// Nothing deleted.
	expect(await prisma.client.count({ where: { ownerId: owner.id } })).toBe(2);
	expect(
		await prisma.invoice.findUnique({ where: { id: sentInvoice.id } })
	).not.toBeNull();
	expect(await prisma.activity.count({ where: { ownerId: owner.id } })).toBe(2);
	expect(
		await prisma.activity.findUnique({ where: { id: cleanActivity.id } })
	).not.toBeNull();
	expect(await prisma.supportItem.count({ where: { ownerId: owner.id } })).toBe(
		2
	);

	// Profile fields all unchanged (the nulling never ran).
	const unchanged = await prisma.user.findUniqueOrThrow({
		where: { id: owner.id }
	});
	expect(Number(unchanged.abn)).toBe(PROFILE.abn);
	expect(unchanged.name).toBe(PROFILE.name);
	expect(unchanged.bankName).toBe(PROFILE.bankName);
	expect(Number(unchanged.bankNumber)).toBe(PROFILE.bankNumber);
	expect(unchanged.bsb).toBe(PROFILE.bsb);
});
