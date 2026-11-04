import { stripTimezone } from "@/lib/date-utils";
import prisma from "@/server/prisma";
import { expect, test } from "@playwright/test";
import { format, subDays } from "date-fns";
import {
	createRandomSupportItem,
	createRandomClient,
	waitForAlert
} from "./test-utils";

test("Can set a Client's Regular Time and apply it to several days", async ({
	page
}) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	const today = stripTimezone(new Date());
	const yesterday = stripTimezone(subDays(new Date(), 1));
	const twoDaysAgo = stripTimezone(subDays(new Date(), 2));

	// Yesterday already holds this Client's work, so it starts unticked.
	const existing = await prisma.activity.create({
		data: {
			clientId: client.id,
			supportItemId: supportItem.id,
			ownerId: client.ownerId,
			date: yesterday,
			startTime: new Date("1970-01-01T09:00:00.000Z"),
			endTime: new Date("1970-01-01T10:00:00.000Z")
		}
	});

	await page.goto(`/dashboard/clients/${client.id}`);
	await page.getByRole("button", { name: "Set regular time" }).click();
	await page.getByLabel("Start").fill("14:35");
	await page.getByLabel("End").fill("16:35");
	await page.getByRole("combobox", { name: "Support Item" }).click();
	await page.getByRole("option", { name: supportItem.description }).click();
	await page.getByRole("button", { name: "Save" }).click();
	await waitForAlert(page, "Regular time saved");
	await expect(page.getByText("2:35pm - 4:35pm")).toBeVisible();

	await page.goto("/dashboard");
	await page.getByRole("button", { name: "Add Activity" }).click();
	await page.getByRole("tab", { name: "Regular time" }).click();
	await page.getByRole("button", { name: client.name }).click();

	const day = (name: string | RegExp) =>
		page.locator("label").filter({ hasText: name });
	await expect(day("Today").getByRole("checkbox")).toBeChecked();
	await expect(
		day("Already has an Activity").getByRole("checkbox")
	).not.toBeChecked();
	await day(format(subDays(new Date(), 2), "EEE d MMM"))
		.getByRole("checkbox")
		.click();

	await page.getByRole("button", { name: "Create 2 Activities" }).click();
	await waitForAlert(page, "2 activities created");

	const created = await prisma.activity.findMany({
		where: { clientId: client.id, id: { not: existing.id } },
		orderBy: { date: "asc" }
	});
	expect(created.map((activity) => activity.date)).toEqual([twoDaysAgo, today]);
	for (const activity of created) {
		expect(activity.startTime).toEqual(new Date("1970-01-01T14:35:00.000Z"));
		expect(activity.endTime).toEqual(new Date("1970-01-01T16:35:00.000Z"));
		expect(activity.supportItemId).toBe(supportItem.id);
		expect(activity.transitDistance).toBeNull();
		expect(activity.transitDuration).toBeNull();
		expect(activity.invoiceId).toBeNull();
	}
});
