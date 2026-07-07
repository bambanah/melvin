import prisma from "@/server/prisma";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { beforeEach, expect, test } from "vitest";
import {
	callerFor,
	createTestUser,
	resetDb
} from "../../src/server/api/test/harness";
import { backfillInvoiceVersions } from "./backfill-invoice-versions";

beforeEach(async () => {
	await resetDb();
});

async function createLegacySentInvoice(
	user: Awaited<ReturnType<typeof createTestUser>>,
	options: { paid?: boolean } = {}
) {
	const caller = callerFor(user);

	const client = await caller.clients.create({
		client: { name: "Legacy Client" }
	});
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 100,
			ownerId: user.id
		}
	});
	const activity = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "11:00",
			itemDistance: 0
		}
	});
	const invoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-LEGACY",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});

	// Simulate a pre-plan-017 SENT/PAID invoice: status set directly, no
	// InvoiceVersion row — this is exactly what `send` could never produce
	// after this plan, but is the real shape of historic data.
	const sentAt = new Date("2024-01-05");
	await prisma.invoice.update({
		where: { id: invoice.id },
		data: {
			status: options.paid ? "PAID" : "SENT",
			sentAt,
			paidAt: options.paid ? new Date("2024-01-10") : null
		}
	});

	const expectedTotal = getTotalCostOfActivities(
		[
			{
				...activity,
				supportItem: { ...supportItem, rateType: "HOUR" }
			}
		],
		{ userTransitRatePerKm: 0.99 }
	);

	return { caller, client, supportItem, activity, invoice, expectedTotal };
}

test("backfills a v1 flagged `backfilled` for a legacy SENT invoice, matching the live total at backfill time", async () => {
	const user = await createTestUser();
	const { invoice, expectedTotal } = await createLegacySentInvoice(user);

	const result = await backfillInvoiceVersions();
	expect(result.backfilled).toBe(1);
	expect(result.skipped).toBe(0);

	const versions = await prisma.invoiceVersion.findMany({
		where: { invoiceId: invoice.id }
	});
	expect(versions).toHaveLength(1);
	expect(versions[0].versionNumber).toBe(1);
	expect(Number(versions[0].total)).toBeCloseTo(expectedTotal, 2);

	const content = versions[0].content as { backfilled?: boolean };
	expect(content.backfilled).toBe(true);

	const caller = callerFor(user);
	const owing = await caller.invoice.getTotalOwing();
	expect(owing).toBeCloseTo(expectedTotal, 2);
});

test("stamps paidAt onto the backfilled version for a legacy PAID invoice", async () => {
	const user = await createTestUser();
	const { invoice } = await createLegacySentInvoice(user, { paid: true });

	await backfillInvoiceVersions();

	const version = await prisma.invoiceVersion.findFirstOrThrow({
		where: { invoiceId: invoice.id }
	});
	expect(version.paidAt).not.toBeNull();
});

test("is idempotent — a second run touches nothing", async () => {
	const user = await createTestUser();
	await createLegacySentInvoice(user);

	await backfillInvoiceVersions();
	const secondRun = await backfillInvoiceVersions();

	expect(secondRun.backfilled).toBe(0);
	expect(secondRun.skipped).toBe(0);

	const allVersions = await prisma.invoiceVersion.findMany();
	expect(allVersions).toHaveLength(1);
});

test("does not touch a draft (CREATED) invoice or one that already has a version", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const client = await caller.clients.create({ client: { name: "Draft" } });
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 100,
			ownerId: user.id
		}
	});
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
	const draftInvoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-DRAFT",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});

	const alreadyVersionedInvoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-SENT",
			activitiesToCreate: []
		}
	});
	await prisma.activity.create({
		data: {
			clientId: client.id,
			supportItemId: supportItem.id,
			ownerId: user.id,
			invoiceId: alreadyVersionedInvoice.id,
			date: new Date("2024-01-02"),
			startTime: new Date("1970-01-01T09:00:00.000Z"),
			endTime: new Date("1970-01-01T10:00:00.000Z"),
			itemDistance: 0
		}
	});
	await caller.invoice.send({ ids: [alreadyVersionedInvoice.id] });

	const result = await backfillInvoiceVersions();

	expect(result.backfilled).toBe(0);
	expect(result.skipped).toBe(0);

	const draftVersions = await prisma.invoiceVersion.findMany({
		where: { invoiceId: draftInvoice.id }
	});
	expect(draftVersions).toHaveLength(0);

	const existingVersions = await prisma.invoiceVersion.findMany({
		where: { invoiceId: alreadyVersionedInvoice.id }
	});
	expect(existingVersions).toHaveLength(1);
});
