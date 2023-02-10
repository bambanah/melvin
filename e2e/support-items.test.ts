import { expect, test } from "@playwright/test";
import { RandomSupportItem } from "./random/random-support-item";

test("Can create, update, and delete support items", async ({ page }) => {
	await page.goto("/support-items");

	await page.getByRole("link", { name: "Add New" }).click();
	await expect(page).toHaveURL("/support-items/create");

	const supportItem = new RandomSupportItem();
	const newSupportItem = new RandomSupportItem();

	await page.locator('[name="description"]').fill(supportItem.description);
	await page.locator('[name="weekdayCode"]').fill(supportItem.weekdayCode);
	await page.locator('[name="weekdayRate"]').fill(supportItem.weekdayRate);

	await page.getByRole("button", { name: "Create" }).click();

	await expect(
		page.getByRole("alert").filter({ hasText: "Support Item Created" })
	).toBeVisible();
	await expect(page).toHaveURL("/support-items");

	await page
		.getByRole("listitem")
		.filter({ hasText: supportItem.description })
		.locator("button:nth-child(1)")
		.click();

	await page.locator('[name="description"]').fill(newSupportItem.description);
	await page.getByRole("button", { name: "Update" }).click();
	await expect(
		page.getByRole("alert").filter({ hasText: "Support Item Updated" })
	).toBeVisible();
	await expect(page).toHaveURL("/support-items");

	await page
		.getByRole("listitem")
		.filter({ hasText: newSupportItem.description })
		.locator("button:nth-child(2)")
		.click();
	page.on("dialog", (dialog) => dialog.accept());
	await page.locator("a").filter({ hasText: "Delete" }).click();
	await page
		.getByRole("alert")
		.filter({ hasText: "support item deleted" })
		.click();
});
