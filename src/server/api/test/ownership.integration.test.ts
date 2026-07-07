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

test("invoice.send rejects a cross-tenant invoice, leaving it unaffected", async () => {
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

	await expect(callerB.invoice.send({ ids: [invoice.id] })).rejects.toThrow(
		TRPCError
	);

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
	await callerA.invoice.send({ ids: [invoice.id] });

	expect(await callerA.invoice.getTotalOwing()).toBeGreaterThan(0);
	expect(await callerB.invoice.getTotalOwing()).toBe(0);
});

test("invoice.modify rejects another user's clientId, leaving clientId unchanged", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const clientA = await callerA.clients.create({
		client: { name: "A's client" }
	});
	const clientB = await callerB.clients.create({
		client: { name: "B's client" }
	});
	const invoice = await callerB.invoice.create({
		invoice: {
			clientId: clientB.id,
			invoiceNo: "INV-B",
			activitiesToCreate: []
		}
	});

	await expect(
		callerB.invoice.modify({
			id: invoice.id,
			invoice: {
				clientId: clientA.id,
				invoiceNo: "INV-B",
				activitiesToCreate: []
			}
		})
	).rejects.toThrow(TRPCError);

	const row = await prisma.invoice.findUniqueOrThrow({
		where: { id: invoice.id }
	});
	expect(row.clientId).toBe(clientB.id);
});

test("activity.add rejects another user's clientId and creates no activity", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerA = callerFor(userA);
	const callerB = callerFor(userB);

	const clientA = await callerA.clients.create({
		client: { name: "A's client" }
	});
	const supportItemB = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: userB.id
		}
	});

	await expect(
		callerB.activity.add({
			activity: {
				clientId: clientA.id,
				supportItemId: supportItemB.id,
				date: new Date("2024-01-01"),
				startTime: "09:00",
				endTime: "10:00",
				itemDistance: 0
			}
		})
	).rejects.toThrow(TRPCError);

	expect(await prisma.activity.count()).toBe(0);
});

test("activity.add rejects another user's supportItemId", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerB = callerFor(userB);

	const clientB = await callerB.clients.create({
		client: { name: "B's client" }
	});
	const supportItemA = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: userA.id
		}
	});

	await expect(
		callerB.activity.add({
			activity: {
				clientId: clientB.id,
				supportItemId: supportItemA.id,
				date: new Date("2024-01-01"),
				startTime: "09:00",
				endTime: "10:00",
				itemDistance: 0
			}
		})
	).rejects.toThrow(TRPCError);

	expect(await prisma.activity.count()).toBe(0);
});

test("supportItem.addCustomRates rejects another user's supportItemId and creates no rate row", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerB = callerFor(userB);

	const supportItemA = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: userA.id
		}
	});

	await expect(
		callerB.supportItem.addCustomRates({
			supportItemRates: {
				supportItemId: supportItemA.id,
				weekdayRate: 50
			}
		})
	).rejects.toThrow(TRPCError);

	expect(await prisma.supportItemRates.count()).toBe(0);
});

test("invoice.create rejects another user's supportItemId in activitiesToCreate", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerB = callerFor(userB);

	const clientB = await callerB.clients.create({
		client: { name: "B's client" }
	});
	const supportItemA = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: userA.id
		}
	});

	await expect(
		callerB.invoice.create({
			invoice: {
				clientId: clientB.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					{
						supportItemId: supportItemA.id,
						groupClientIds: [],
						activities: [
							{
								date: new Date("2024-01-01"),
								startTime: "09:00",
								endTime: "10:00",
								itemDistance: 0
							}
						]
					}
				]
			}
		})
	).rejects.toThrow(TRPCError);

	expect(await prisma.activity.count()).toBe(0);
});

test("invoice.modify rejects another user's supportItemId in activitiesToCreate", async () => {
	const userA = await createTestUser();
	const userB = await createTestUser();
	const callerB = callerFor(userB);

	const clientB = await callerB.clients.create({
		client: { name: "B's client" }
	});
	const supportItemA = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: userA.id
		}
	});
	const invoice = await callerB.invoice.create({
		invoice: {
			clientId: clientB.id,
			invoiceNo: "INV-1",
			activitiesToCreate: []
		}
	});

	await expect(
		callerB.invoice.modify({
			id: invoice.id,
			invoice: {
				clientId: clientB.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					{
						supportItemId: supportItemA.id,
						groupClientIds: [],
						activities: [
							{
								date: new Date("2024-01-01"),
								startTime: "09:00",
								endTime: "10:00",
								itemDistance: 0
							}
						]
					}
				]
			}
		})
	).rejects.toThrow(TRPCError);

	expect(await prisma.activity.count()).toBe(0);
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
