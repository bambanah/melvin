import { billableLines } from "@/lib/billing-lines";
import type { InvoiceStatus, User } from "@/generated/client";
import prisma from "@/server/prisma";
import { beforeEach, describe, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

async function createSupportItem(owner: User) {
	return prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01_011_0107_1_1",
			weekdayRate: 100,
			rateType: "HOUR",
			ownerId: owner.id
		}
	});
}

async function createClient(owner: User, name = "Client") {
	return prisma.client.create({
		data: { name, ownerId: owner.id, transitRatePerKm: 0.99 }
	});
}

interface ActivityFixtureOptions {
	date: string;
	start?: string;
	end?: string;
	transitDistance?: number;
	transitDuration?: number;
	transport?: { type: "DISTANCE" | "PARKING"; amount: number; note?: string }[];
	status?: InvoiceStatus | "PENDING";
}

async function createActivity(
	owner: User,
	clientId: string,
	supportItemId: string,
	options: ActivityFixtureOptions
) {
	let invoiceId: string | undefined;
	if (options.status && options.status !== "PENDING") {
		const invoice = await prisma.invoice.create({
			data: {
				invoiceNo: `INV-${options.status}-${options.date}`,
				date: new Date(options.date),
				status: options.status,
				clientId,
				ownerId: owner.id
			}
		});
		invoiceId = invoice.id;
	}

	return prisma.activity.create({
		data: {
			date: new Date(options.date),
			startTime: options.start ? new Date(options.start) : undefined,
			endTime: options.end ? new Date(options.end) : undefined,
			transitDistance: options.transitDistance,
			transitDuration: options.transitDuration,
			ownerId: owner.id,
			clientId,
			supportItemId,
			invoiceId,
			transportItems: options.transport
				? {
						create: options.transport.map((t) => ({
							type: t.type,
							amount: t.amount,
							note: t.note
						}))
					}
				: undefined
		}
	});
}

describe("activity.unbilledList / unbilledSummary", () => {
	test("includes pending, draft and amended activities; excludes sent and paid", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await createClient(owner);

		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-01-01T00:00:00.000Z",
			start: "2024-01-01T09:00:00.000Z",
			end: "2024-01-01T10:00:00.000Z",
			status: "PENDING"
		});
		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-02-01T00:00:00.000Z",
			start: "2024-02-01T09:00:00.000Z",
			end: "2024-02-01T10:00:00.000Z",
			status: "CREATED" // draft / re-opened amendment
		});
		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-03-01T00:00:00.000Z",
			start: "2024-03-01T09:00:00.000Z",
			end: "2024-03-01T10:00:00.000Z",
			status: "SENT"
		});
		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-04-01T00:00:00.000Z",
			start: "2024-04-01T09:00:00.000Z",
			end: "2024-04-01T10:00:00.000Z",
			status: "PAID"
		});

		const { activities } = await caller.activity.unbilledList({});
		const dates = activities.map((a) => a.date.toISOString());

		expect(dates).toEqual([
			"2024-01-01T00:00:00.000Z",
			"2024-02-01T00:00:00.000Z"
		]);

		const summary = await caller.activity.unbilledSummary();
		expect(summary.count).toBe(2);
	});

	test("summary total equals the sum of billableLines over exactly the listed set", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await createClient(owner);

		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-01-01T00:00:00.000Z",
			start: "2024-01-01T09:00:00.000Z",
			end: "2024-01-01T11:00:00.000Z",
			transitDistance: 18,
			transitDuration: 25,
			transport: [
				{ type: "DISTANCE", amount: 14 },
				{ type: "PARKING", amount: 12.5, note: "hospital carpark" }
			],
			status: "PENDING"
		});
		// A SENT activity that must NOT contribute to the summary total.
		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-05-01T00:00:00.000Z",
			start: "2024-05-01T09:00:00.000Z",
			end: "2024-05-01T10:00:00.000Z",
			status: "SENT"
		});

		const { activities } = await caller.activity.unbilledList({});
		const rateContext = { userTransitRatePerKm: 0.99 };
		const expectedTotal = activities
			.flatMap((a) => billableLines(a, rateContext, { forDisplay: true }))
			.reduce((sum, line) => sum + line.total, 0);

		const summary = await caller.activity.unbilledSummary();
		expect(summary.total).toBeCloseTo(expectedTotal, 2);
		expect(summary.total).toBeGreaterThan(0);
	});

	test("orders oldest first by date then start time, across all months", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await createClient(owner);

		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-03-01T00:00:00.000Z",
			start: "2024-03-01T14:00:00.000Z",
			end: "2024-03-01T15:00:00.000Z",
			status: "PENDING"
		});
		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-01-15T00:00:00.000Z",
			start: "2024-01-15T09:00:00.000Z",
			end: "2024-01-15T10:00:00.000Z",
			status: "PENDING"
		});
		await createActivity(owner, client.id, supportItem.id, {
			date: "2024-01-15T00:00:00.000Z",
			start: "2024-01-15T07:00:00.000Z",
			end: "2024-01-15T08:00:00.000Z",
			status: "PENDING"
		});

		const { activities } = await caller.activity.unbilledList({});
		// startTime is stored time-only (1970 epoch date), so assert the day and
		// the time-of-day ordering separately.
		const order = activities.map((a) => ({
			date: a.date.toISOString(),
			time: a.startTime ? a.startTime.toISOString().slice(11, 16) : undefined
		}));
		expect(order).toEqual([
			{ date: "2024-01-15T00:00:00.000Z", time: "07:00" },
			{ date: "2024-01-15T00:00:00.000Z", time: "09:00" },
			{ date: "2024-03-01T00:00:00.000Z", time: "14:00" }
		]);
	});

	test("paginates via cursor without repeating rows", async () => {
		const owner = await createTestUser();
		const caller = callerFor(owner);
		const supportItem = await createSupportItem(owner);
		const client = await createClient(owner);

		for (let day = 1; day <= 5; day++) {
			const date = `2024-01-0${day}T00:00:00.000Z`;
			await createActivity(owner, client.id, supportItem.id, {
				date,
				start: `2024-01-0${day}T09:00:00.000Z`,
				end: `2024-01-0${day}T10:00:00.000Z`,
				status: "PENDING"
			});
		}

		const first = await caller.activity.unbilledList({ limit: 2 });
		expect(first.activities).toHaveLength(2);
		expect(first.nextCursor).toBeDefined();

		const second = await caller.activity.unbilledList({
			limit: 2,
			cursor: first.nextCursor
		});

		const firstIds = new Set(first.activities.map((a) => a.id));
		expect(second.activities.some((a) => firstIds.has(a.id))).toBe(false);
	});

	test("does not leak other owners' activities", async () => {
		const owner = await createTestUser("Owner");
		const other = await createTestUser("Other");
		const caller = callerFor(owner);

		const otherSupportItem = await createSupportItem(other);
		const otherClient = await createClient(other, "Other Client");
		await createActivity(other, otherClient.id, otherSupportItem.id, {
			date: "2024-01-01T00:00:00.000Z",
			start: "2024-01-01T09:00:00.000Z",
			end: "2024-01-01T10:00:00.000Z",
			status: "PENDING"
		});

		const { activities } = await caller.activity.unbilledList({});
		expect(activities).toHaveLength(0);

		const summary = await caller.activity.unbilledSummary();
		expect(summary.count).toBe(0);
		expect(summary.total).toBe(0);
	});
});
