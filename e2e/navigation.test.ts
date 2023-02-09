import { expect, test } from "@playwright/test";

test("Root should redirect to invoices page", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveURL("/invoices");
});

test("Navbar buttons should work", async ({ page }) => {
	await page.goto("/");

	await page.getByRole("link", { name: "Activities" }).click();
	await expect(page).toHaveURL("/activities");

	await page.getByRole("link", { name: "Invoices" }).click();
	await expect(page).toHaveURL("/invoices");

	await page.getByRole("link", { name: "Support Items" }).click();
	await expect(page).toHaveURL("/support-items");

	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/clients");
});
