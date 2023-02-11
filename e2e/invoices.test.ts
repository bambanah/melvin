import { expect, test } from "@playwright/test";
import { randomClient } from "./random/random-client";
import { randomInvoice } from "./random/random-invoice";
import { randomSupportItem } from "./random/random-support-item";

test("Can create, update, and delete invoices", async ({ page }) => {
	await page.goto("/");

	const client = randomClient();
	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/clients");
	await page.getByRole("button", { name: "+ Add New" }).click();
	await page.locator('[name="name"]').fill(client.name);
	await page.getByRole("button", { name: "Create" }).click();
	await page.getByRole("alert").filter({ hasText: "Client created" }).click();

	const supportItem = randomSupportItem();
	await page.getByRole("link", { name: "Support Items" }).click();
	await expect(page).toHaveURL("/support-items");
	await page.getByRole("button", { name: "+ Add New" }).click();
	await page.locator('[name="description"]').fill(supportItem.description);
	await page.locator('[name="weekdayCode"]').fill(supportItem.weekdayCode);
	await page.locator('[name="weekdayRate"]').fill(supportItem.weekdayRate);
	await page.getByRole("button", { name: "Create" }).click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Support Item created" })
		.click();

	const invoice = randomInvoice();
	const newRandomInvoice = randomInvoice();

	await page.getByRole("link", { name: "Invoices" }).click();
	await expect(page).toHaveURL("/invoices");
	await page.getByRole("button", { name: "+ Add New" }).click();

	await page.locator(".react-select").click();
	await page.getByText(client.name, { exact: true }).click();

	await page.locator('[name="invoiceNo"]').fill(invoice.invoiceNo);
	await page.getByRole("button", { name: "Confirm" }).click();
	await page.locator(".react-select").nth(1).click();
	await page.getByText(supportItem.description, { exact: true }).click();
	await page
		.locator('[id="activities\\.0\\.date"]')
		.fill(invoice.activities[0].date);
	await page
		.locator('[name="activities\\.0\\.startTime"]')
		.fill(invoice.activities[0].startTime);
	await page
		.locator('[name="activities\\.0\\.endTime"]')
		.fill(invoice.activities[0].endTime);
	await page
		.locator('[id="activities\\.0\\.transitDistance"]')
		.fill(invoice.activities[0].transitDistance);
	await page
		.locator('[id="activities\\.0\\.transitDuration"]')
		.fill(invoice.activities[0].transitDuration);
	await page.getByRole("button", { name: "Create" }).click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Invoice created" })
		.isVisible();
	await expect(page).toHaveURL("/invoices");
	await expect(
		page.getByRole("listitem").filter({ hasText: invoice.invoiceNo })
	).toHaveCount(1);

	await page.getByRole("button").nth(2).click();
	await page.getByRole("link", { name: "Edit" }).click();
	await page.locator("#invoiceNo").fill(newRandomInvoice.invoiceNo);
	await page.getByRole("button", { name: "Update" }).click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Invoice updated" })
		.isVisible();
	await expect(page).toHaveURL("/invoices");

	// FIXME: Why is this so flaky? Is Formik really that shit??
	await expect(
		page.getByRole("listitem").filter({ hasText: newRandomInvoice.invoiceNo })
	).toHaveCount(1);

	await page.getByRole("button").nth(2).click();
	page.once("dialog", (dialog) => dialog.accept());
	await page.getByText("Delete").click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Invoice deleted" })
		.isVisible();
});
