import { expect, test } from "@playwright/test";
import { randomInvoice } from "./random/random-invoice";
import {
	createRandomActivity,
	createRandomClient,
	createRandomSupportItem,
	waitForAlert,
} from "./test-utils";

test("Can create, update, and delete invoices", async ({ page }) => {
	await page.goto("/dashboard");
	const client = await createRandomClient(page);
	const supportItem = await createRandomSupportItem(page);
	await createRandomActivity(page, client.name, supportItem.description);

	const invoice = randomInvoice();
	const newRandomInvoice = randomInvoice();

	await page.getByRole("link", { name: "Invoices" }).click();
	await expect(page).toHaveURL("/dashboard/invoices");
	await page.getByRole("link", { name: "Add" }).click();

	await page.getByLabel("Client").click();
	await page.getByLabel(client.name).click();

	await page.getByLabel("Invoice Number").fill(invoice.invoiceNo);
	await page
		.getByText(supportItem.description, { exact: true })
		.first()
		.click();

	await page.getByRole("button", { name: "Create" }).click();
	await waitForAlert(page, "invoice created");

	await page
		.getByTestId("invoice-list-item")
		.filter({
			hasText: `${invoice.invoiceNo}: ${client.name}`,
		})
		.getByRole("button")
		.click();
	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.getByLabel("Invoice Number").fill(newRandomInvoice.invoiceNo);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "invoice updated");
	await page.getByRole("link", { name: "Invoices" }).click();

	await page
		.getByTestId("invoice-list-item")
		.filter({
			hasText: `${newRandomInvoice.invoiceNo}: ${client.name}`,
		})
		.getByRole("button")
		.click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await waitForAlert(page, "invoice deleted");
});
