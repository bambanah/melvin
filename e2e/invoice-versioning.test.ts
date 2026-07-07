import { extractPdfText } from "@/lib/testing/pdf-test-utils";
import { expect, test } from "@playwright/test";
import { randomInvoice } from "./random/random-invoice";
import {
	createRandomActivity,
	createRandomClient,
	createRandomSupportItem,
	waitForAlert
} from "./test-utils";

/**
 * The Step 7 journey from docs/plans/017-invoice-versioning.md: create →
 * download draft (watermarked) → send & download (clean v1) → amend
 * (confirm) → edit an activity → send → v2 with the supersedes line; both
 * versions stay downloadable; the list shows one row for the one invoice.
 */
test("Invoice versioning journey: draft → send → amend → edit → re-send freezes v2", async ({
	page
}) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	await createRandomActivity(client.id, supportItem.id, {
		startTime: "09:00",
		endTime: "10:00"
	});

	const invoice = randomInvoice();

	await page.goto("/dashboard/invoices");
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
		.getByRole("link", { name: invoice.invoiceNo })
		.click();
	await expect(page).toHaveURL(/\/dashboard\/invoices\/[^/]+$/);
	const invoiceId = page.url().split("/").pop()!;

	// --- Download draft: DRAFT-watermarked, no supersedes line ---
	await page.getByRole("button", { name: "Download" }).click();
	await page.getByRole("menuitem", { name: "Download draft" }).click();

	const draftResponse = await page.request.get(
		`/api/invoices/generate-pdf/${invoiceId}?base64=true`
	);
	expect(draftResponse.status()).toBe(200);
	const draftText = await extractPdfText(await draftResponse.text());
	expect(draftText).toContain("DRAFT");
	expect(draftText).toContain(`Invoice Number: ${invoice.invoiceNo}`);
	expect(draftText).not.toContain("supersedes");

	// --- Send & download: freezes v1, clean render, locks the invoice ---
	await page.getByRole("button", { name: "Download" }).click();
	await page.getByRole("menuitem", { name: "Send & download" }).click();

	await expect(page.getByRole("button", { name: "Amend" })).toBeVisible({
		timeout: 10000
	});
	await expect(
		page.getByRole("heading", { name: invoice.invoiceNo, exact: true })
	).toBeVisible();

	const v1Response = await page.request.get(
		`/api/invoices/generate-pdf/${invoiceId}?base64=true`
	);
	expect(v1Response.status()).toBe(200);
	expect(v1Response.headers()["content-disposition"]).toContain(
		`${invoice.invoiceNo}.pdf`
	);
	const v1Text = await extractPdfText(await v1Response.text());
	expect(v1Text).not.toContain("DRAFT");
	expect(v1Text).not.toContain("supersedes");

	// --- Amend: confirm dialog, unlocks back to draft ---
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("button", { name: "Amend" }).click();
	await expect(page.getByRole("button", { name: "Mark as Sent" })).toBeVisible({
		timeout: 10000
	});

	// --- Edit the activity that's on the invoice ---
	await page.goto("/dashboard/activities");
	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();
	await page
		.locator("div")
		.filter({ hasText: new RegExp(`^${supportItem.description}$`) })
		.getByRole("button")
		.click();
	await page.getByRole("menuitem", { name: "Edit" }).click();
	await page.getByLabel("Start Time").fill("09:30");
	await page.getByLabel("End Time").fill("11:00");
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "activity updated");

	// --- Re-send: freezes v2 with the supersedes line ---
	await page.goto(`/dashboard/invoices/${invoiceId}`);
	await page.getByRole("button", { name: "Mark as Sent" }).click();
	await expect(page.getByRole("button", { name: "Amend" })).toBeVisible({
		timeout: 10000
	});
	await expect(
		page.getByRole("heading", { name: `${invoice.invoiceNo}a`, exact: true })
	).toBeVisible();

	const v2Response = await page.request.get(
		`/api/invoices/generate-pdf/${invoiceId}?base64=true`
	);
	expect(v2Response.headers()["content-disposition"]).toContain(
		`${invoice.invoiceNo}a.pdf`
	);
	const v2Text = await extractPdfText(await v2Response.text());
	expect(v2Text).toContain(`Invoice Number: ${invoice.invoiceNo}a`);
	expect(v2Text).toContain(
		`This invoice amends and supersedes ${invoice.invoiceNo}`
	);

	// --- Both versions stay downloadable, by explicit version number ---
	const v1Again = await page.request.get(
		`/api/invoices/generate-pdf/${invoiceId}?base64=true&versionNumber=1`
	);
	expect(v1Again.status()).toBe(200);
	expect(v1Again.headers()["content-disposition"]).toContain(
		`${invoice.invoiceNo}.pdf`
	);
	const v2Again = await page.request.get(
		`/api/invoices/generate-pdf/${invoiceId}?base64=true&versionNumber=2`
	);
	expect(v2Again.status()).toBe(200);
	expect(v2Again.headers()["content-disposition"]).toContain(
		`${invoice.invoiceNo}a.pdf`
	);

	// --- Version history lists both versions on the invoice page ---
	await expect(
		page.getByText(invoice.invoiceNo, { exact: true }).first()
	).toBeVisible();
	await expect(
		page.getByText(`${invoice.invoiceNo}a`, { exact: true }).first()
	).toBeVisible();

	// --- The list shows one row for this invoice, not one per version ---
	await page.goto("/dashboard/invoices");
	await expect(
		page.getByRole("row").filter({ hasText: invoice.invoiceNo })
	).toHaveCount(1);
});
