import { expect, test } from "@playwright/test";
import { randomSupportItem } from "./random/random-support-item";
import { waitForAlert } from "./test-utils";

test("Can create, update, and delete support items", async ({ page }) => {
	await page.goto("/dashboard/support-items");

	await page.getByRole("link", { name: "Add" }).click();
	await expect(page).toHaveURL("/dashboard/support-items/create");

	const supportItem = randomSupportItem();
	const newSupportItem = randomSupportItem();

	await page.getByLabel("Description").fill(supportItem.description);
	await page
		.getByPlaceholder("XX_XXX_XXXX_X_X")
		.first()
		.fill(supportItem.weekdayCode);
	await page.getByPlaceholder("rate").first().fill(supportItem.weekdayRate);

	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "Support Item Created");
	await expect(page).toHaveURL("/dashboard/support-items");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.first()
		.click();

	await page
		.locator("div")
		.filter({ hasText: new RegExp(`^${supportItem.description}$`) })
		.getByRole("button")
		.click();
	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.getByLabel("Description").fill(newSupportItem.description);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "Support Item Updated");

	await expect(page).toHaveURL("/dashboard/support-items");

	await page.getByRole("link", { name: newSupportItem.description }).click();
	await page
		.locator("div")
		.filter({ hasText: new RegExp(`^${newSupportItem.description}$`) })
		.getByRole("button")
		.click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();

	await waitForAlert(page, "Support Item Deleted");
});
