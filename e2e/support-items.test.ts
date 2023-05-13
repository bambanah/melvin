import { expect, test } from "@playwright/test";
import { randomSupportItem } from "./random/random-support-item";
import { waitForAlert } from "./test-utils";

test("Can create, update, and delete support items", async ({ page }) => {
	await page.goto("/support-items");

	await page.getByRole("link", { name: "Add New" }).click();
	await expect(page).toHaveURL("/support-items/create");

	const supportItem = randomSupportItem();
	const newSupportItem = randomSupportItem();

	await page.locator("#description").fill(supportItem.description);
	await page.locator("#weekdayCode").fill(supportItem.weekdayCode);
	await page.locator("#weekdayRate").fill(supportItem.weekdayRate);

	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "Support Item Created");
	await expect(page).toHaveURL("/support-items");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();
	await page.locator("button#options-dropdown").click();
	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.locator("#description").fill(newSupportItem.description);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "Support Item Updated");

	await page.getByRole("link", { name: "Items" }).click();
	await expect(page).toHaveURL("/support-items");

	await page.getByRole("link", { name: newSupportItem.description }).click();
	await page.locator("button#options-dropdown").click();
	await page.locator("button").filter({ hasText: "Delete" }).click();
	await page.locator("button").filter({ hasText: "Delete" }).click();
	await waitForAlert(page, "Support Item Deleted");
});
