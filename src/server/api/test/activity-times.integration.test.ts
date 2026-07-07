import prisma from "@/server/prisma";
import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

test("activity.add rejects an end-before-start (overnight) time range and creates no row", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const client = await caller.clients.create({
		client: { name: "A's client" }
	});
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01",
			weekdayRate: 100,
			ownerId: user.id
		}
	});

	await expect(
		caller.activity.add({
			activity: {
				clientId: client.id,
				supportItemId: supportItem.id,
				date: new Date("2024-01-01"),
				startTime: "23:00",
				endTime: "01:00",
				itemDistance: 0
			}
		})
	).rejects.toThrow(TRPCError);

	expect(await prisma.activity.count({ where: { ownerId: user.id } })).toBe(0);
});
