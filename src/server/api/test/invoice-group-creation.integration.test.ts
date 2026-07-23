import prisma from "@/server/prisma";
import type { User } from "@/generated/client";
import { beforeEach, describe, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

async function createGroupSupportItem(owner: User) {
	return prisma.supportItem.create({
		data: {
			description: "Group Activities - Standard",
			isGroup: true,
			weekdayCode: "04_102_0136_6_1",
			weekdayRate: 70.2,
			ownerId: owner.id
		}
	});
}

async function createClients(owner: User, count: number) {
	return Promise.all(
		Array.from({ length: count }, (_, index) =>
			prisma.client.create({
				data: { name: `Client ${index + 1}`, ownerId: owner.id }
			})
		)
	);
}

function activityToCreate({
	supportItemId,
	groupClientIds
}: {
	supportItemId: string;
	groupClientIds: string[];
}) {
	return {
		supportItemId,
		groupClientIds,
		activities: [
			{
				date: new Date("2024-01-01"),
				startTime: "09:00",
				endTime: "11:00"
			}
		]
	};
}

describe("invoice.create with group activities", () => {
	test("fans out one mirrored activity per group client and stamps groupSize on all of them", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, ...others] = await createClients(owner, 3);

		const invoice = await caller.invoice.create({
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					activityToCreate({
						supportItemId: supportItem.id,
						groupClientIds: others.map((c) => c.id)
					})
				]
			}
		});

		const activities = await prisma.activity.findMany({
			where: { invoiceId: invoice.id },
			select: { clientId: true, groupSize: true }
		});
		const pending = await prisma.activity.findMany({
			where: { ownerId: owner.id, invoiceId: null },
			select: { clientId: true, groupSize: true }
		});

		expect(activities).toHaveLength(1);
		expect(activities[0]).toEqual({ clientId: primary.id, groupSize: 3 });
		expect(pending).toHaveLength(2);
		expect(new Set(pending.map((a) => a.clientId))).toEqual(
			new Set(others.map((c) => c.id))
		);
		expect(pending.every((a) => a.groupSize === 3)).toBe(true);
	});

	test("succeeds with 9 group clients (10 activities total)", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, ...others] = await createClients(owner, 10);

		await caller.invoice.create({
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					activityToCreate({
						supportItemId: supportItem.id,
						groupClientIds: others.map((c) => c.id)
					})
				]
			}
		});

		const activities = await prisma.activity.findMany({
			where: { ownerId: owner.id },
			select: { groupSize: true }
		});
		expect(activities).toHaveLength(10);
		expect(activities.every((a) => a.groupSize === 10)).toBe(true);
	});

	test("rejects 10 group clients (11 participants, over the cap)", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, ...others] = await createClients(owner, 11);

		await expect(
			caller.invoice.create({
				invoice: {
					clientId: primary.id,
					invoiceNo: "INV-1",
					activitiesToCreate: [
						activityToCreate({
							supportItemId: supportItem.id,
							groupClientIds: others.map((c) => c.id)
						})
					]
				}
			})
		).rejects.toThrow();
	});

	test("rejects duplicate group client ids", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, other] = await createClients(owner, 2);

		await expect(
			caller.invoice.create({
				invoice: {
					clientId: primary.id,
					invoiceNo: "INV-1",
					activitiesToCreate: [
						activityToCreate({
							supportItemId: supportItem.id,
							groupClientIds: [other.id, other.id]
						})
					]
				}
			})
		).rejects.toThrow(/distinct/i);
	});

	test("rejects the primary client appearing among the group clients", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, other] = await createClients(owner, 2);

		await expect(
			caller.invoice.create({
				invoice: {
					clientId: primary.id,
					invoiceNo: "INV-1",
					activitiesToCreate: [
						activityToCreate({
							supportItemId: supportItem.id,
							groupClientIds: [other.id, primary.id]
						})
					]
				}
			})
		).rejects.toThrow(/primary client/i);
	});

	test("rejects a group support item with zero group clients", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary] = await createClients(owner, 1);

		await expect(
			caller.invoice.create({
				invoice: {
					clientId: primary.id,
					invoiceNo: "INV-1",
					activitiesToCreate: [
						activityToCreate({
							supportItemId: supportItem.id,
							groupClientIds: []
						})
					]
				}
			})
		).rejects.toThrow(/at least one other participant/i);
	});

	// A nonexistent group client is only discovered inside
	// createGroupMirrorActivities, which runs *after* the invoice write. Before
	// the transaction wrap, this left a committed invoice + primary activity
	// with a groupSize but zero participant rows.
	test("rolls back the invoice write when a group client doesn't exist", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, other] = await createClients(owner, 2);

		await expect(
			caller.invoice.create({
				invoice: {
					clientId: primary.id,
					invoiceNo: "INV-1",
					activitiesToCreate: [
						activityToCreate({
							supportItemId: supportItem.id,
							groupClientIds: [other.id, "nonexistent-client-id"]
						})
					]
				}
			})
		).rejects.toThrow(/not found/i);

		expect(await prisma.invoice.count({ where: { ownerId: owner.id } })).toBe(
			0
		);
		expect(await prisma.activity.count({ where: { ownerId: owner.id } })).toBe(
			0
		);
	});
});

describe("invoice.modify with group activities", () => {
	test("fans out mirrored activities and stamps groupSize when a group row is added on edit", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, ...others] = await createClients(owner, 3);

		const invoice = await caller.invoice.create({
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activitiesToCreate: []
			}
		});

		await caller.invoice.modify({
			id: invoice.id,
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					activityToCreate({
						supportItemId: supportItem.id,
						groupClientIds: others.map((c) => c.id)
					})
				]
			}
		});

		const onInvoice = await prisma.activity.findMany({
			where: { invoiceId: invoice.id },
			select: { clientId: true, groupSize: true }
		});
		const pending = await prisma.activity.findMany({
			where: { ownerId: owner.id, invoiceId: null },
			select: { clientId: true, groupSize: true }
		});

		expect(onInvoice).toEqual([{ clientId: primary.id, groupSize: 3 }]);
		expect(pending).toHaveLength(2);
		expect(new Set(pending.map((a) => a.clientId))).toEqual(
			new Set(others.map((c) => c.id))
		);
		expect(pending.every((a) => a.groupSize === 3)).toBe(true);
	});

	// Characterization: `invoice-form.tsx` seeds `activityIds`
	// from `existingInvoice.activities` (the persisted primary row) and leaves
	// `activitiesToCreate` empty on edit — mirror participant rows have
	// `invoiceId: null` so they never appear in `existingInvoice.activities`
	// and are never re-sent inside `activitiesToCreate`. Resubmitting that
	// real payload shape, unchanged, must not re-fan the mirrors.
	test("resubmitting the edit-form payload for an unchanged group row does not duplicate mirror activities", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, ...others] = await createClients(owner, 3);

		const invoice = await caller.invoice.create({
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activitiesToCreate: [
					activityToCreate({
						supportItemId: supportItem.id,
						groupClientIds: others.map((c) => c.id)
					})
				]
			}
		});

		const totalBefore = await prisma.activity.count({
			where: { ownerId: owner.id }
		});
		expect(totalBefore).toBe(3); // 1 primary + 2 mirrors

		const primaryActivity = await prisma.activity.findFirstOrThrow({
			where: { invoiceId: invoice.id },
			select: { id: true }
		});

		// Mirrors this shape's actual construction in invoice-form.tsx:
		// `activityIds: existingInvoice.activities.map((a) => a.id)`, with
		// `activitiesToCreate` left at its unseeded (empty) default.
		await caller.invoice.modify({
			id: invoice.id,
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activityIds: [primaryActivity.id],
				activitiesToCreate: []
			}
		});

		const totalAfter = await prisma.activity.count({
			where: { ownerId: owner.id }
		});
		expect(totalAfter).toBe(totalBefore);
	});

	test("rejects the primary client appearing among the group clients on edit", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createGroupSupportItem(owner);
		const [primary, other] = await createClients(owner, 2);

		const invoice = await caller.invoice.create({
			invoice: {
				clientId: primary.id,
				invoiceNo: "INV-1",
				activitiesToCreate: []
			}
		});

		await expect(
			caller.invoice.modify({
				id: invoice.id,
				invoice: {
					clientId: primary.id,
					invoiceNo: "INV-1",
					activitiesToCreate: [
						activityToCreate({
							supportItemId: supportItem.id,
							groupClientIds: [other.id, primary.id]
						})
					]
				}
			})
		).rejects.toThrow(/primary client/i);
	});
});
