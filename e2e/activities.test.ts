import { expect, test } from "@playwright/test";

test.skip("Can create, update, and delete activities", async ({ page }) => {
	// TODO: Implement
	await expect(page).toHaveURL("/invoices");
});
