import { expect, test } from "@playwright/test";
import { randomClient } from "./factories/client-factory";

test("Can create, edit, and delete clients", async ({ page }) => {
	await page.goto("/clients");

	await page.getByRole("link", { name: "Add New" }).click();

	const client = randomClient();
	const updatedClient = randomClient();

	await page.locator("input#name").fill(client.name);
	await page.locator("input#number").fill(client.number);
	await page.locator("input#billTo").fill(client.billTo);

	await page.getByRole("button", { name: "Create" }).click();

	await expect(
		page.getByRole("alert").filter({ hasText: "Client Created" })
	).toBeVisible();
	await expect(page).toHaveURL("/clients");

	await page
		.getByRole("listitem")
		.filter({ hasText: client.name })
		.locator("button:nth-child(2)")
		.click();
	await page.getByRole("link", { name: "Edit" }).click();

	await page.locator("input#name").fill(updatedClient.name);
	await page.getByRole("button", { name: "Update" }).click();
	await expect(
		page.getByRole("alert").filter({ hasText: "Client Updated" })
	).toBeVisible();
	await expect(page).toHaveURL("/clients");

	await page
		.getByRole("listitem")
		.filter({ hasText: updatedClient.name })
		.locator("button:nth-child(2)")
		.click();
	page.on("dialog", (dialog) => dialog.accept());
	await page.locator("a").filter({ hasText: "Delete" }).click();
	await page.getByRole("alert").filter({ hasText: "Client deleted" }).click();
});
