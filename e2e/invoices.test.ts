import { expect, test } from "@playwright/test";
import { randomInvoice } from "./random/random-invoice";
import {
	createRandomActivity,
	createRandomClient,
	createRandomSupportItem,
	waitForAlert
} from "./test-utils";

test("Can create, update, and delete invoices", async ({ page }) => {
	await page.goto("/dashboard");
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	await createRandomActivity(client.id, supportItem.id);

	const invoice = randomInvoice();
	const newRandomInvoice = randomInvoice();

	await page.getByRole("link", { name: "Invoices" }).click();
	await expect(page).toHaveURL("/dashboard/invoices");
	await page.getByRole("link", { name: "Add" }).click();

	await page.getByLabel("Client").click();
	await page.getByLabel(client.name).first().click();

	const invoiceNoInput = page.getByLabel("Invoice Number");
	await expect(invoiceNoInput).toHaveValue(
		client.invoiceNumberPrefix ? `${client.invoiceNumberPrefix}1` : ""
	);
	await invoiceNoInput.fill(invoice.invoiceNo);

	await page
		.getByText(supportItem.description, { exact: true })
		.first()
		.click();

	await page.getByRole("button", { name: "Create" }).click();
	await waitForAlert(page, "invoice created");

	await page
		.getByRole("row")
		.filter({ hasText: invoice.invoiceNo })
		.getByTestId("more-actions")
		.click();
	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.getByLabel("Invoice Number").fill(newRandomInvoice.invoiceNo);
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "invoice updated");
	await page.getByRole("link", { name: "Invoices" }).click();

	await page
		.getByRole("row")
		.filter({ hasText: newRandomInvoice.invoiceNo })
		.getByTestId("more-actions")
		.click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();
});

test("Invoice filters persist in URL and across navigation", async ({
	page
}) => {
	await page.goto("/dashboard");
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	await createRandomActivity(client.id, supportItem.id);

	const invoice = randomInvoice();

	await page.getByRole("link", { name: "Invoices" }).click();
	await page.getByRole("link", { name: "Add" }).click();
	await page.getByLabel("Client").click();
	await page.getByLabel(client.name).first().click();
	await expect(page.getByLabel("Invoice Number")).toHaveValue(
		new RegExp(`^${client.invoiceNumberPrefix}`)
	);
	await page.getByLabel("Invoice Number").fill(invoice.invoiceNo);
	await page
		.getByText(supportItem.description, { exact: true })
		.first()
		.click();
	await page.getByRole("button", { name: "Create" }).click();
	await waitForAlert(page, "invoice created");

	// Wait for table to load with the new invoice before searching
	const invoiceRow = page
		.getByRole("row")
		.filter({ hasText: invoice.invoiceNo });
	await expect(invoiceRow).toBeVisible({ timeout: 10000 });

	const searchInput = page.getByPlaceholder("Search invoices...");
	await searchInput.fill(invoice.invoiceNo);

	// Wait for debounce (300ms) + URL update
	await expect(page).toHaveURL(new RegExp(`q=${invoice.invoiceNo}`), {
		timeout: 5000
	});
	// Verify row is still visible after filtering
	await expect(invoiceRow).toBeVisible();
	// Ensure the data fetch completes so history state is stable
	await page.waitForLoadState("networkidle");

	// Use client-side navigation to better simulate real user behavior
	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/dashboard/clients");
	await page.waitForLoadState("networkidle");
	await page.goBack();
	await page.waitForLoadState("networkidle");

	// Wait for page to fully restore state
	await expect(page).toHaveURL(new RegExp(`q=${invoice.invoiceNo}`), {
		timeout: 5000
	});
	await expect(searchInput).toHaveValue(invoice.invoiceNo, { timeout: 5000 });
	await expect(invoiceRow).toBeVisible({ timeout: 5000 });

	await page.getByRole("button", { name: "Clear filters" }).click();

	// Wait for URL and input to clear
	await expect(page).not.toHaveURL(/q=/, { timeout: 5000 });
	await expect(searchInput).toHaveValue("");

	// Wait for table to refresh with all invoices
	await expect(invoiceRow).toBeVisible({ timeout: 5000 });

	await invoiceRow.getByTestId("more-actions").click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();
});

test("Invoice filters persist across page reload", async ({ page }) => {
	await page.goto("/dashboard");
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	await createRandomActivity(client.id, supportItem.id);

	const invoice = randomInvoice();

	await page.getByRole("link", { name: "Invoices" }).click();
	await page.getByRole("link", { name: "Add" }).click();
	await page.getByLabel("Client").click();
	await page.getByLabel(client.name).first().click();
	await expect(page.getByLabel("Invoice Number")).toHaveValue(
		new RegExp(`^${client.invoiceNumberPrefix}`)
	);
	await page.getByLabel("Invoice Number").fill(invoice.invoiceNo);
	await page
		.getByText(supportItem.description, { exact: true })
		.first()
		.click();
	await page.getByRole("button", { name: "Create" }).click();
	await waitForAlert(page, "invoice created");

	// Wait for table to load with the new invoice before searching
	const invoiceRow = page
		.getByRole("row")
		.filter({ hasText: invoice.invoiceNo });
	await expect(invoiceRow).toBeVisible({ timeout: 10000 });

	const searchInput = page.getByPlaceholder("Search invoices...");
	await searchInput.fill(invoice.invoiceNo);

	await expect(page).toHaveURL(new RegExp(`q=${invoice.invoiceNo}`), {
		timeout: 5000
	});
	await expect(invoiceRow).toBeVisible();
	await page.waitForLoadState("networkidle");

	// Hard reload the page
	await page.reload();
	await page.waitForLoadState("networkidle");

	// Verify filters persist after reload
	await expect(page).toHaveURL(new RegExp(`q=${invoice.invoiceNo}`));
	await expect(searchInput).toHaveValue(invoice.invoiceNo, { timeout: 5000 });
	await expect(invoiceRow).toBeVisible({ timeout: 10000 });

	// Clean up
	await page.getByRole("button", { name: "Clear filters" }).click();
	await expect(invoiceRow).toBeVisible({ timeout: 5000 });
	await invoiceRow.getByTestId("more-actions").click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();
});

test("Invalid URL params fallback to defaults", async ({ page }) => {
	// Navigate with invalid status param
	await page.goto("/dashboard/invoices?status=invalid_status&client=fake-uuid");

	// Page should load without errors
	await expect(page.getByPlaceholder("Search invoices...")).toBeVisible();

	// Status dropdown should show placeholder (default state when no valid value)
	const statusTrigger = page
		.locator("button")
		.filter({ hasText: "Paid Status" });
	await expect(statusTrigger).toBeVisible();

	// The invalid client param should be treated as a filter (non-empty string)
	// so Clear filters should be enabled
	await expect(
		page.getByRole("button", { name: "Clear filters" })
	).toBeEnabled();
});

test("Mobile layout displays correctly", async ({ page }) => {
	// Set mobile viewport
	await page.setViewportSize({ width: 375, height: 667 });

	await page.goto("/dashboard/invoices");
	await page.waitForLoadState("networkidle");

	const searchInput = page.getByPlaceholder("Search invoices...");
	await expect(searchInput).toBeVisible();

	// On mobile, the filter row should stack vertically
	// Check that status dropdown (combobox) is visible
	const statusDropdown = page
		.getByRole("combobox")
		.filter({ hasText: "Paid Status" });
	await expect(statusDropdown).toBeVisible();

	// Client dropdown (combobox) should be visible
	const clientDropdown = page
		.getByRole("combobox")
		.filter({ hasText: "Client" });
	await expect(clientDropdown).toBeVisible();

	// Clear filters button should be visible
	await expect(
		page.getByRole("button", { name: "Clear filters" })
	).toBeVisible();
});
