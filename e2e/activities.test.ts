import { expect, test } from "@playwright/test";
import {
	createDefaultSupportItem,
	createRandomActivity,
	createRandomClient,
	createRandomSupportItem,
	waitForAlert
} from "./test-utils";

test("Can create activity", async ({ page }) => {
	const client = await createRandomClient();
	await createDefaultSupportItem();

	await page.goto("/dashboard");

	await page.getByRole("button", { name: "Add Activity" }).click();
	await page.getByTestId("client-search-input").fill(client.name);
	await page.getByRole("button", { name: client.name }).click();
	await page.getByTestId("time-range-input").fill("08:00-09:00");
	await page.getByRole("button", { name: "Save all" }).click();

	await waitForAlert(page, "saved");
});

test("Can edit activity", async ({ page }) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	const activity = await createRandomActivity(client.id, supportItem.id, {
		startTime: "11:00",
		endTime: "12:00"
	});

	await page.goto("/dashboard/activities");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();

	await page
		.locator("div")
		.filter({ hasText: new RegExp(`^${supportItem.description}$`) })
		.getByRole("button")
		.click();
	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.getByLabel("Start Time").fill("11:30");
	await page.getByLabel("End Time").fill("12:30");
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "activity updated");
	await expect(page).toHaveURL(`/dashboard/activities/${activity.id}`);
});

test("Can delete activity", async ({ page }) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	await createRandomActivity(client.id, supportItem.id, {
		startTime: "14:00",
		endTime: "15:00"
	});

	await page.goto("/dashboard/activities");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();

	await page
		.locator("div")
		.filter({ hasText: new RegExp(`^${supportItem.description}$`) })
		.getByRole("button")
		.click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await waitForAlert(page, "activity deleted");
});
