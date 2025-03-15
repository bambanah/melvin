import { expect, test } from "@playwright/test";

test("Root should redirect to invoices page", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveURL("/dashboard");
});

test("Navbar buttons should work", async ({ page }) => {
	await page.goto("/dashboard");

	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/dashboard/clients");

	await page.getByRole("link", { name: "Invoices" }).click();
	await expect(page).toHaveURL("/dashboard/invoices");

	await page.getByRole("link", { name: "Activities" }).click();
	await expect(page).toHaveURL("/dashboard/activities");

	await page.getByRole("link", { name: "Items" }).click();
	await expect(page).toHaveURL("/dashboard/support-items");
});
