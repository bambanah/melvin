import prisma from "@/server/prisma";
import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

test("two users see only their own clients", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	expect((await callerA.clients.list({})).clients).toHaveLength(0);

	const client = await callerA.clients.create({
		client: { name: "A's client" }
	});

	expect((await callerA.clients.list({})).clients.map((c) => c.id)).toEqual([
		client.id
	]);
	expect((await callerB.clients.list({})).clients).toHaveLength(0);
});

test("invoice.updateStatus scoped to caller's own invoices as a no-op, not a NOT_FOUND", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const client = await callerA.clients.create({
		client: { name: "A's client" }
	});
	const invoice = await callerA.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-1",
			activitiesToCreate: []
		}
	});

	// NOTE: unlike the other single-record mutations in this suite,
	// updateStatus uses `updateMany` scoped by ownerId rather than a
	// findFirst-then-update, so a cross-tenant call silently matches zero
	// rows instead of throwing NOT_FOUND. A's data is unaffected either way.
	const payload = await callerB.invoice.updateStatus({
		ids: [invoice.id],
		status: "SENT"
	});
	expect(payload.count).toBe(0);

	const unchanged = await callerA.invoice.byId({ id: invoice.id });
	expect(unchanged.status).toBe("CREATED");
});

test("clients.delete rejects a cross-tenant delete and leaves the client intact", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const client = await callerA.clients.create({
		client: { name: "A's client" }
	});

	await expect(callerB.clients.delete({ id: client.id })).rejects.toThrow(
		TRPCError
	);

	const stillExists = await callerA.clients.byId({ id: client.id });
	expect(stillExists.id).toBe(client.id);
});

test("activity.modify rejects a cross-tenant modification", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const client = await callerA.clients.create({
		client: { name: "A's client" }
	});
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: userA.id
		}
	});
	const activity = await callerA.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});

	await expect(
		callerB.activity.modify({
			id: activity.id,
			activity: {
				clientId: client.id,
				supportItemId: supportItem.id,
				date: new Date("2024-01-01"),
				startTime: "09:00",
				endTime: "11:00",
				itemDistance: 0
			}
		})
	).rejects.toThrow(TRPCError);

	const unchanged = await callerA.activity.byId({ id: activity.id });
	expect(unchanged.endTime?.toISOString()).toBe(
		activity.endTime?.toISOString()
	);
});

test("invoice.getTotalOwing excludes another owner's SENT invoices", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const client = await callerA.clients.create({
		client: { name: "A's client" }
	});
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: userA.id
		}
	});
	const activity = await callerA.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const invoice = await callerA.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-1",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});
	await callerA.invoice.updateStatus({ ids: [invoice.id], status: "SENT" });

	expect(await callerA.invoice.getTotalOwing()).toBeGreaterThan(0);
	expect(await callerB.invoice.getTotalOwing()).toBe(0);
});

test("pdf.forInvoice denies a cross-tenant request", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const client = await callerA.clients.create({
		client: { name: "A's client" }
	});
	const invoice = await callerA.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-1",
			activitiesToCreate: []
		}
	});

	await expect(
		callerB.pdf.forInvoice({ invoiceId: invoice.id })
	).rejects.toThrow(TRPCError);
});
