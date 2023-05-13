import { expect, test } from "@playwright/test";
import { randomInvoice } from "./random/random-invoice";
import {
	createRandomActivity,
	createRandomClient,
	createRandomSupportItem,
	waitForAlert,
} from "./test-utils";

test("Can create, update, and delete invoices", async ({ page }) => {
	await page.goto("/");
	const client = await createRandomClient(page);
	const supportItem = await createRandomSupportItem(page);
	await createRandomActivity(page, client.name, supportItem.description);

	const invoice = randomInvoice();
	const newRandomInvoice = randomInvoice();

	await page.getByRole("link", { name: "Invoices" }).click();
	await expect(page).toHaveURL("/invoices");
	await page.getByRole("link", { name: "Add New" }).click();

	await page.locator(".react-select").click();
	await page.getByText(client.name, { exact: true }).click();

	await page.locator("#invoiceNo").fill(invoice.invoiceNo);
	await page.getByText(supportItem.description, { exact: true }).click();

	await page.getByRole("button", { name: "Create" }).click();
	await waitForAlert(page, "invoice created");
	await expect(page).toHaveURL("/invoices");
	await page.getByRole("link", { name: invoice.invoiceNo }).click();

	await page.getByRole("link", { name: "Edit" }).click();

	await page.locator("#invoiceNo").fill(newRandomInvoice.invoiceNo);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "invoice updated");
	await page.getByRole("link", { name: "Invoices" }).click();

	await expect(page).toHaveURL("/invoices");

	// TODO: Delete invoice
	// await page.getByRole("link", { name: newRandomInvoice.invoiceNo }).click();
	// await page.locator("button#options-dropdown").click();
	// await page.locator("button").filter({ hasText: "Delete" }).click();
	// await page.locator("button").filter({ hasText: "Delete" }).click();
	// await waitForAlert(page, "invoice deleted");
});
