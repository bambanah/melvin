import { expect, test } from "@playwright/test";
import { RandomClient } from "./random/random-client";
import { RandomInvoice } from "./random/random-invoice";
import { RandomSupportItem } from "./random/random-support-item";

test("Can create, update, and delete invoices", async ({ page }) => {
	await page.goto("/");

	const randomClient = new RandomClient();
	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/clients");
	await page.getByRole("button", { name: "+ Add New" }).click();
	await page.locator("#name").fill(randomClient.name);
	await page.getByRole("button", { name: "Create" }).click();
	await page.getByRole("alert").filter({ hasText: "Client created" }).click();

	const randomSupportItem = new RandomSupportItem();
	await page.getByRole("link", { name: "Support Items" }).click();
	await expect(page).toHaveURL("/support-items");
	await page.getByRole("button", { name: "+ Add New" }).click();
	await page.locator("#description").fill(randomSupportItem.description);
	await page.locator("#weekdayCode").fill(randomSupportItem.weekdayCode);
	await page.locator("#weekdayRate").fill(randomSupportItem.weekdayRate);
	await page.getByRole("button", { name: "Create" }).click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Support Item created" })
		.click();

	const randomInvoice = new RandomInvoice();
	await page.getByRole("link", { name: "Invoices" }).click();
	await expect(page).toHaveURL("/invoices");
	await page.getByRole("button", { name: "+ Add New" }).click();

	await page.locator(".react-select").click();
	await page.getByText(randomClient.name, { exact: true }).click();

	await page.locator("#invoiceNo").fill(randomInvoice.invoiceNo);
	await page.getByRole("button", { name: "Confirm" }).click();
	await page.locator(".react-select").nth(1).click();
	await page.getByText(randomSupportItem.description, { exact: true }).click();
	await page
		.locator('[id="activities\\.0\\.date"]')
		.fill(randomInvoice.activities[0].date);
	await page
		.locator('[name="activities\\.0\\.startTime"]')
		.fill(randomInvoice.activities[0].startTime);
	await page
		.locator('[name="activities\\.0\\.endTime"]')
		.fill(randomInvoice.activities[0].endTime);
	await page
		.locator('[id="activities\\.0\\.transitDistance"]')
		.fill(randomInvoice.activities[0].transitDistance);
	await page
		.locator('[id="activities\\.0\\.transitDuration"]')
		.fill(randomInvoice.activities[0].transitDuration);
	await page.getByRole("button", { name: "Create" }).click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Invoice created" })
		.isVisible();
	await expect(page).toHaveURL("/invoices");
	await expect(
		page.getByRole("listitem").filter({ hasText: randomInvoice.invoiceNo })
	).toHaveCount(1);

	await page.getByRole("button").nth(2).click();
	await page.getByRole("link", { name: "Edit" }).click();
	await page.locator("#invoiceNo").fill("Invoice 20202");
	await page.getByRole("button", { name: "Update" }).click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Invoice updated" })
		.isVisible();
	await expect(page).toHaveURL("/invoices");

	await expect(
		page.getByRole("listitem").filter({ hasText: "Invoice 20202" })
	).toHaveCount(1);

	await page.getByRole("button").nth(2).click();
	page.once("dialog", (dialog) => dialog.accept());
	await page.getByText("Delete").click();
	await page
		.getByRole("alert")
		.filter({ hasText: "Invoice deleted" })
		.isVisible();
});
