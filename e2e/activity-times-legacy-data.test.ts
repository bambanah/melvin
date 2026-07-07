import prisma from "@/server/prisma";
import { expect, test } from "@playwright/test";
import {
	createRandomClient,
	createRandomSupportItem,
	testUser
} from "./test-utils";

/**
 * The schema now rejects end-before-start times on write (docs/plans/019),
 * but rows written before that fix can still exist. This seeds one directly
 * via Prisma — bypassing the app layer, the only way such a row can exist —
 * to prove the activities list degrades instead of crashing on it.
 */
test("Activities list degrades gracefully on a legacy reversed-time activity", async ({
	page
}) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();

	await prisma.activity.create({
		data: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date(),
			startTime: new Date("1970-01-01T23:00:00.000Z"),
			endTime: new Date("1970-01-01T01:00:00.000Z"),
			ownerId: testUser.id
		}
	});

	await page.goto("/dashboard/activities");

	await expect(
		page.getByRole("link").filter({ hasText: supportItem.description })
	).toBeVisible();
	await expect(page.getByText("invalid time")).toBeVisible();
	await expect(page.getByText("$0.00")).toBeVisible();

	if (process.env.EVIDENCE_SCREENSHOT_PATH) {
		await page.screenshot({
			path: process.env.EVIDENCE_SCREENSHOT_PATH,
			fullPage: true
		});
	}
});
