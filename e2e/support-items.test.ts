import { expect, test } from "@playwright/test";
import { randomSupportItem } from "./random/random-support-item";
import { waitForAlert } from "./test-utils";

test("Can create, update, and delete support items", async ({ page }) => {
	await page.goto("/dashboard/support-items");

	await page.getByRole("link", { name: "Add", exact: true }).click();
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

	await page.getByRole("link", { name: "Edit" }).click();

	await page.getByLabel("Description").fill(newSupportItem.description);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "Support Item Updated");

	await expect(page).toHaveURL("/dashboard/support-items");

	await page
		.getByRole("link")
		.filter({ hasText: newSupportItem.description })
		.first()
		.click();
	await page.getByRole("button", { name: "Support item actions" }).click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete", exact: true }).click();

	await waitForAlert(page, "Support Item Deleted");
});

test("Support item form shows its own validation messages", async ({
	page
}) => {
	await page.goto("/dashboard/support-items/create");

	const weekdayCode = page.getByPlaceholder("XX_XXX_XXXX_X_X").first();
	const weekdayRate = page.getByPlaceholder("rate").first();

	// An untouched weekday rate never reaches the coercion.
	await page.getByRole("button", { name: "Create" }).click();
	await expect(page.getByText("Must be a number")).toBeVisible();

	await weekdayCode.fill("nope");
	await weekdayRate.fill("1.234");
	await page.getByRole("button", { name: "Create" }).click();

	await expect(
		page.getByText("Must be in format XX_XXX_XXXX_X_X")
	).toBeVisible();
	await expect(
		page.getByText("Can't be more than 2 decimal places (x.xx)")
	).toBeVisible();
});
