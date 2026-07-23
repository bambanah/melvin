import prisma from "@/server/prisma";
import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "../test/harness";

beforeEach(async () => {
	await resetDb();
});

async function setupInvoiceWithActivity(
	user: Awaited<ReturnType<typeof createTestUser>>
) {
	const caller = callerFor(user);

	const client = await caller.clients.create({
		client: { name: "Jane Citizen" }
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

	return { caller, client, supportItem, activity, invoice };
}

test("send freezes v1 with correct content and locks the invoice", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	const { invoices } = await caller.invoice.send({ ids: [invoice.id] });

	expect(invoices[0].status).toBe("SENT");
	expect(invoices[0].versions).toHaveLength(1);
	expect(invoices[0].versions![0].versionNumber).toBe(1);
	expect(invoices[0].versions![0].displayInvoiceNo).toBe("INV-1");
	expect(invoices[0].versions![0].total).toBeGreaterThan(0);

	const versions = await prisma.invoiceVersion.findMany({
		where: { invoiceId: invoice.id }
	});
	expect(versions).toHaveLength(1);
	expect(versions[0].versionNumber).toBe(1);

	const content = versions[0].content as { lines: unknown[]; total: number };
	expect(content.lines.length).toBeGreaterThan(0);
	expect(content.total).toBe(Number(versions[0].total));
});

test("double-send is rejected", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });

	await expect(caller.invoice.send({ ids: [invoice.id] })).rejects.toThrow(
		TRPCError
	);

	const versions = await prisma.invoiceVersion.findMany({
		where: { invoiceId: invoice.id }
	});
	expect(versions).toHaveLength(1);
});

test("sending an invoice with no activities is rejected", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);
	const client = await caller.clients.create({
		client: { name: "No Activities" }
	});
	const invoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-EMPTY",
			activitiesToCreate: []
		}
	});

	await expect(caller.invoice.send({ ids: [invoice.id] })).rejects.toThrow(
		TRPCError
	);

	const unchanged = await caller.invoice.byId({ id: invoice.id });
	expect(unchanged.status).toBe("CREATED");
});

test("amend unlocks a SENT invoice back to CREATED", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });
	const amended = await caller.invoice.amend({ id: invoice.id });

	expect(amended.status).toBe("CREATED");
	expect(amended.sentAt).toBeNull();

	const byId = await caller.invoice.byId({ id: invoice.id });
	expect(byId.versions).toHaveLength(1);
});

test("amend unlocks a PAID invoice back to CREATED, and re-sending adds v2 with the supersedes reference", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });
	await caller.invoice.markPaid({ ids: [invoice.id] });

	const amended = await caller.invoice.amend({ id: invoice.id });
	expect(amended.status).toBe("CREATED");
	expect(amended.paidAt).toBeNull();

	// The paid version keeps its own paidAt even after the invoice-level
	// field is cleared by amend (docs/plans/017 Step 3).
	const v1 = await prisma.invoiceVersion.findFirstOrThrow({
		where: { invoiceId: invoice.id, versionNumber: 1 }
	});
	expect(v1.paidAt).not.toBeNull();

	const { invoices } = await caller.invoice.send({ ids: [invoice.id] });
	expect(invoices[0].versions).toHaveLength(2);
	const v2 = invoices[0].versions!.find((v) => v.versionNumber === 2)!;
	expect(v2.displayInvoiceNo).toBe("INV-1a");

	const v2Content = (
		await prisma.invoiceVersion.findFirstOrThrow({
			where: { invoiceId: invoice.id, versionNumber: 2 }
		})
	).content as { header: { amendsDisplayInvoiceNo?: string } };
	expect(v2Content.header.amendsDisplayInvoiceNo).toBe("INV-1");
});

test("amend rejects a draft invoice", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await expect(caller.invoice.amend({ id: invoice.id })).rejects.toThrow(
		TRPCError
	);
});

test("markPaid rejects a draft invoice", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await expect(caller.invoice.markPaid({ ids: [invoice.id] })).rejects.toThrow(
		TRPCError
	);
});

test("unmarkPaid clears paidAt on the invoice and the latest version", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });
	await caller.invoice.markPaid({ ids: [invoice.id] });

	const { invoices } = await caller.invoice.unmarkPaid({ ids: [invoice.id] });
	expect(invoices[0].status).toBe("SENT");
	expect(invoices[0].paidAt).toBeNull();

	const v1 = await prisma.invoiceVersion.findFirstOrThrow({
		where: { invoiceId: invoice.id, versionNumber: 1 }
	});
	expect(v1.paidAt).toBeNull();
});

test("unmarkPaid rejects a sent (not paid) invoice", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });

	await expect(
		caller.invoice.unmarkPaid({ ids: [invoice.id] })
	).rejects.toThrow(TRPCError);
});

test("getTotalOwing sums frozen version totals, unaffected by a post-send rate edit", async () => {
	const user = await createTestUser();
	const { caller, invoice, supportItem } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });

	const owingBeforeEdit = await caller.invoice.getTotalOwing();
	expect(owingBeforeEdit).toBeGreaterThan(0);

	await prisma.supportItem.update({
		where: { id: supportItem.id },
		data: { weekdayRate: 999999 }
	});

	const owingAfterEdit = await caller.invoice.getTotalOwing();
	expect(owingAfterEdit).toBe(owingBeforeEdit);
});

test("matchByPayment finds the frozen amount, unaffected by a post-send rate edit", async () => {
	const user = await createTestUser();
	const { caller, invoice, supportItem } = await setupInvoiceWithActivity(user);

	const { invoices } = await caller.invoice.send({ ids: [invoice.id] });
	const frozenTotal = invoices[0].versions![0].total;

	await prisma.supportItem.update({
		where: { id: supportItem.id },
		data: { weekdayRate: 999999 }
	});

	const { invoiceIds, invoiceDetails } = await caller.invoice.matchByPayment({
		paymentAmount: frozenTotal
	});

	expect(invoiceIds.flat(2)).toContain(invoice.id);
	const matched = invoiceDetails.find((i) => i.id === invoice.id)!;
	expect(matched.total).toBe(frozenTotal);
});

test("deleteVersion drops the sole version and reverts the invoice to draft", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });

	const result = await caller.invoice.deleteVersion({
		id: invoice.id,
		versionNumber: 1
	});
	expect(result.status).toBe("CREATED");
	expect(result.sentAt).toBeNull();
	expect(result.versions).toHaveLength(0);

	const versions = await prisma.invoiceVersion.findMany({
		where: { invoiceId: invoice.id }
	});
	expect(versions).toHaveLength(0);
});

test("deleting the sole version then re-sending reuses v1 with no suffix", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });
	await caller.invoice.deleteVersion({ id: invoice.id, versionNumber: 1 });

	const { invoices } = await caller.invoice.send({ ids: [invoice.id] });
	expect(invoices[0].versions).toHaveLength(1);
	expect(invoices[0].versions![0].versionNumber).toBe(1);
	expect(invoices[0].versions![0].displayInvoiceNo).toBe("INV-1");
});

test("deleting the latest of two versions re-adopts the previous version's state and reuses its number", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	// v1, then amend + re-send for v2 (INV-1a).
	await caller.invoice.send({ ids: [invoice.id] });
	await caller.invoice.amend({ id: invoice.id });
	await caller.invoice.send({ ids: [invoice.id] });

	const deleted = await caller.invoice.deleteVersion({
		id: invoice.id,
		versionNumber: 2
	});
	expect(deleted.status).toBe("SENT");
	expect(deleted.versions).toHaveLength(1);
	expect(deleted.versions![0].versionNumber).toBe(1);

	// Re-sending reuses number 2 (INV-1a) rather than pushing to a further suffix.
	await caller.invoice.amend({ id: invoice.id });
	const { invoices } = await caller.invoice.send({ ids: [invoice.id] });
	const latest = invoices[0].versions![0];
	expect(latest.versionNumber).toBe(2);
	expect(latest.displayInvoiceNo).toBe("INV-1a");
});

test("deleteVersion rejects deleting a non-latest version", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(user);

	await caller.invoice.send({ ids: [invoice.id] });
	await caller.invoice.amend({ id: invoice.id });
	await caller.invoice.send({ ids: [invoice.id] });

	await expect(
		caller.invoice.deleteVersion({ id: invoice.id, versionNumber: 1 })
	).rejects.toThrow(TRPCError);

	const versions = await prisma.invoiceVersion.findMany({
		where: { invoiceId: invoice.id }
	});
	expect(versions).toHaveLength(2);
});

test("send/amend/markPaid/unmarkPaid/deleteVersion are scoped to the caller's own invoices", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const { caller, invoice } = await setupInvoiceWithActivity(userA);
	const callerB = callerFor(userB);

	await caller.invoice.send({ ids: [invoice.id] });

	await expect(callerB.invoice.send({ ids: [invoice.id] })).rejects.toThrow(
		TRPCError
	);
	await expect(callerB.invoice.amend({ id: invoice.id })).rejects.toThrow(
		TRPCError
	);
	await expect(callerB.invoice.markPaid({ ids: [invoice.id] })).rejects.toThrow(
		TRPCError
	);
	await expect(
		callerB.invoice.unmarkPaid({ ids: [invoice.id] })
	).rejects.toThrow(TRPCError);
	await expect(
		callerB.invoice.deleteVersion({ id: invoice.id, versionNumber: 1 })
	).rejects.toThrow(TRPCError);
});
