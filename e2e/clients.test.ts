import { expect, test } from "@playwright/test";
import { randomClient } from "./random/random-client";
import { waitForAlert } from "./test-utils";

test("Can create, edit, and delete clients", async ({ page }) => {
	await page.goto("/dashboard/clients");

	await page.getByRole("link", { name: "Add" }).click();
	await expect(page).toHaveURL("/dashboard/clients/create");

	const client = randomClient();
	const updatedClient = randomClient();

	await page.getByLabel("Participant Name").fill(client.name);
	await page.getByLabel("Participant Number").fill(client.number);
	await page.getByLabel("Invoice Number").fill(client.invoiceNumberPrefix);
	await page.getByLabel("Bill To").fill(client.billTo);

	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "Client Created");
	await expect(page).toHaveURL("/dashboard/clients");

	await page.getByRole("link").filter({ hasText: client.name }).click();

	await page
		.locator("div")
		.filter({ hasText: new RegExp(`^${client.name}$`) })
		.getByRole("button")
		.click();

	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.getByLabel("Participant Name").fill(updatedClient.name);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "Client Updated");

	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/dashboard/clients");

	await page
		.getByRole("link")
		.filter({ hasText: updatedClient.name })
		.first()
		.click();

	await page
		.locator("div")
		.filter({ hasText: new RegExp(`^${updatedClient.name}$`) })
		.getByRole("button")
		.click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await waitForAlert(page, "client deleted");
});
