import { expect, test } from "@playwright/test";
import { randomClient } from "./random/random-client";
import { waitForAlert } from "./test-utils";

test("Can create, edit, and delete clients", async ({ page }) => {
	await page.goto("/dashboard/clients");

	await page.getByRole("link", { name: "Add" }).click();
	await expect(page).toHaveURL("/dashboard/clients/create");

	const client = randomClient();
	const updatedClient = randomClient({ avoidName: client.name });

	await page.locator("#name").fill(client.name);
	await page.locator("#number").fill(client.number);
	await page.locator("#invoiceNumberPrefix").fill(client.invoiceNumberPrefix);
	await page.locator("#billTo").fill(client.billTo);

	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "Client Created");
	await expect(page).toHaveURL("/dashboard/clients");

	await page.getByRole("link").filter({ hasText: client.name }).click();

	await page.locator("button#options-dropdown").click();
	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.locator("#name").fill(updatedClient.name);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "Client Updated");

	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/dashboard/clients");

	await page.getByRole("link").filter({ hasText: updatedClient.name }).click();
	await page.locator("button#options-dropdown").click();
	await page.locator("button").filter({ hasText: "Delete" }).click();
	await page.locator("button").filter({ hasText: "Delete" }).click();
	await waitForAlert(page, "Client deleted");
});
