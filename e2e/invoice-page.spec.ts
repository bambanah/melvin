import { expect, test } from "@playwright/test";

test("Should navigate to invoices page", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveURL("/invoices");
});
