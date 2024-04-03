import { expect, test } from "@playwright/test";
import {
	createRandomClient,
	createRandomSupportItem,
	waitForAlert,
} from "./test-utils";

test("Can create, update, and delete activities", async ({ page }) => {
	await page.goto("/dashboard");

	const client = await createRandomClient(page);
	const supportItem = await createRandomSupportItem(page);

	await page.getByRole("link", { name: "Activities" }).nth(0).click();
	await expect(page).toHaveURL("/dashboard/activities");
	await page.getByRole("link", { name: "Add" }).click();

	await page.getByText("Select a support item...").click();
	await page.getByLabel(supportItem.description).click();
	await page.getByText("Select a client...").click();
	await page.getByLabel(client.name).first().click();

	await page.getByLabel("Start Time").fill("09:15");
	await page.getByLabel("End Time").fill("15:23");
	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "activity created");

	await expect(page).toHaveURL("/dashboard/activities");

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

	await page.getByLabel("Start Time").fill("13:25");
	await page.getByLabel("End Time").fill("16:56");
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "activity updated");

	await page.getByRole("link", { name: "Activities" }).click();
	await expect(page).toHaveURL("/dashboard/activities");

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
