import prisma from "@/server/prisma";
import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

async function setupSentInvoice() {
	const user = await createTestUser();
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
	const activityA = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const activityB = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-02"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const invoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-1",
			activityIds: [activityA.id, activityB.id],
			activitiesToCreate: []
		}
	});
	await caller.invoice.send({ ids: [invoice.id] });

	return { user, caller, client, supportItem, activityA, activityB, invoice };
}

test("invoice.modify rejects a locked invoice", async () => {
	const { caller, invoice } = await setupSentInvoice();

	await expect(
		caller.invoice.modify({
			id: invoice.id,
			invoice: {
				clientId: invoice.clientId,
				invoiceNo: "INV-1-RENAMED",
				activitiesToCreate: []
			}
		})
	).rejects.toThrow(TRPCError);
});

test("invoice.create rejects connecting an activity that belongs to a locked invoice", async () => {
	const { caller, client, activityA } = await setupSentInvoice();

	await expect(
		caller.invoice.create({
			invoice: {
				clientId: client.id,
				invoiceNo: "INV-STEAL",
				activityIds: [activityA.id],
				activitiesToCreate: []
			}
		})
	).rejects.toThrow(TRPCError);
});

test("invoice.modify rejects connecting an activity that belongs to another locked invoice", async () => {
	const { caller, client, activityA } = await setupSentInvoice();

	const draftInvoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-DRAFT-2",
			activitiesToCreate: []
		}
	});

	await expect(
		caller.invoice.modify({
			id: draftInvoice.id,
			invoice: {
				clientId: client.id,
				invoiceNo: "INV-DRAFT-2",
				activityIds: [activityA.id],
				activitiesToCreate: []
			}
		})
	).rejects.toThrow(TRPCError);
});

test("invoice.delete rejects an invoice with a version", async () => {
	const { caller, invoice } = await setupSentInvoice();

	await expect(caller.invoice.delete({ id: invoice.id })).rejects.toThrow(
		TRPCError
	);

	const stillExists = await prisma.invoice.findUnique({
		where: { id: invoice.id }
	});
	expect(stillExists).not.toBeNull();
});

test("activity.modify rejects an activity on a locked invoice", async () => {
	const { caller, activityA } = await setupSentInvoice();

	await expect(
		caller.activity.modify({
			id: activityA.id,
			activity: {
				clientId: activityA.clientId!,
				supportItemId: activityA.supportItemId,
				date: activityA.date,
				startTime: "09:00",
				endTime: "11:00",
				itemDistance: 0
			}
		})
	).rejects.toThrow(TRPCError);
});

test("activity.delete rejects an activity on a locked invoice", async () => {
	const { caller, activityA } = await setupSentInvoice();

	await expect(caller.activity.delete({ id: activityA.id })).rejects.toThrow(
		TRPCError
	);
});

test("activity.modify still works on a draft invoice's activity", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);
	const client = await caller.clients.create({ client: { name: "Draft" } });
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
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
	await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-DRAFT",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});

	const { activity: modified } = await caller.activity.modify({
		id: activity.id,
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "11:00",
			itemDistance: 0
		}
	});
	expect(modified.id).toBe(activity.id);
});

test("trip.create rejects when an activity is on a locked invoice", async () => {
	const { caller, activityA, activityB } = await setupSentInvoice();

	await expect(
		caller.trip.create({
			date: new Date("2024-01-01"),
			activityIds: [activityA.id, activityB.id],
			interClientLegs: []
		})
	).rejects.toThrow(TRPCError);
});

test("trip.addActivity rejects when the incoming activity is on a locked invoice", async () => {
	const { caller, client, supportItem, activityA } = await setupSentInvoice();

	const draftActivity1 = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-02-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const draftActivity2 = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-02-01"),
			startTime: "10:00",
			endTime: "11:00",
			itemDistance: 0
		}
	});
	const trip = await caller.trip.create({
		date: new Date("2024-02-01"),
		activityIds: [draftActivity1.id, draftActivity2.id],
		interClientLegs: []
	});

	await expect(
		caller.trip.addActivity({
			tripId: trip!.id,
			activityId: activityA.id,
			interClientLegs: []
		})
	).rejects.toThrow(TRPCError);
});

test("trip.removeActivity/update/delete reject once the trip's activities are on a locked invoice", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);
	const client = await caller.clients.create({ client: { name: "Trip" } });
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: user.id
		}
	});
	const activityA = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const activityB = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "10:00",
			endTime: "11:00",
			itemDistance: 0
		}
	});
	const trip = await caller.trip.create({
		date: new Date("2024-01-01"),
		activityIds: [activityA.id, activityB.id],
		interClientLegs: []
	});

	const invoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-TRIP",
			activityIds: [activityA.id, activityB.id],
			activitiesToCreate: []
		}
	});
	await caller.invoice.send({ ids: [invoice.id] });

	await expect(
		caller.trip.removeActivity({ tripId: trip!.id, activityId: activityA.id })
	).rejects.toThrow(TRPCError);

	await expect(
		caller.trip.update({ tripId: trip!.id, interClientLegs: [] })
	).rejects.toThrow(TRPCError);

	await expect(caller.trip.delete({ tripId: trip!.id })).rejects.toThrow(
		TRPCError
	);
});

test("support-item.delete rejects when an activity on a locked invoice uses it", async () => {
	const { caller, supportItem } = await setupSentInvoice();

	await expect(
		caller.supportItem.delete({ id: supportItem.id })
	).rejects.toThrow(TRPCError);
});

test("clients.delete rejects when the client has a sent invoice", async () => {
	const { caller, client } = await setupSentInvoice();

	await expect(caller.clients.delete({ id: client.id })).rejects.toThrow(
		TRPCError
	);
});
