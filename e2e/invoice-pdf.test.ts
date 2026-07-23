import { floorToCent } from "@/lib/generic-utils";
import { extractPdfText } from "@/lib/testing/pdf-test-utils";
import prisma from "@/server/prisma";
import { expect, test } from "@playwright/test";
import { createRealisticInvoice, createRichInvoice } from "./test-utils";

test("Invoice PDF flow: page total, preview, and generated PDF content", async ({
	page
}) => {
	const { invoice, client, expectedPageTotal, expectedPdfTotal } =
		await createRichInvoice();

	await page.goto(`/dashboard/invoices/${invoice.id}`);

	// The page total is computed from the byId query, which omits
	// transportItems and client-specific rates — so for a rich invoice it
	// intentionally differs from the PDF's printed Total (current behavior,
	// documented not fixed)
	await expect(page.getByTestId("invoice-total")).toContainText(
		`$${expectedPageTotal.toFixed(2)}`
	);

	// The base64 endpoint carries the content assertions: its body is the
	// clean base64 PDF, unlike the streaming path below
	const base64Response = await page.request.get(
		`/api/invoices/generate-pdf/${invoice.id}?base64=true`
	);
	expect(base64Response.status()).toBe(200);
	expect(base64Response.headers()["content-type"]).toContain("application/pdf");

	const text = await extractPdfText(await base64Response.text());
	expect(text).toContain(`Invoice Number: ${invoice.invoiceNo}`);
	expect(text).toContain(`Participant Name: ${client.name}`);
	expect(text).toContain("04_104_0125_6_1"); // main support item (weekday)
	expect(text).toContain("04_799_0125_6_1"); // provider travel non-labour
	expect(text).toContain("04_590_0125_6_1"); // activity based transport
	expect(text).toContain(`$${expectedPdfTotal.toFixed(2)}`);
});

test("Realistic plan-managed invoice: group and solo travel codes in the PDF", async ({
	page
}) => {
	const { invoice, client, expectedPageTotal, expectedPdfTotal } =
		await createRealisticInvoice();

	await page.goto(`/dashboard/invoices/${invoice.id}`);
	// The page renders the total via toLocaleString(undefined, AUD); Playwright
	// browsers default to en-US, giving "A$1,076.23" — mirror that here since
	// this total (unlike createRichInvoice's) crosses the thousands separator
	await expect(page.getByTestId("invoice-total")).toContainText(
		expectedPageTotal.toLocaleString("en-US", {
			style: "currency",
			currency: "AUD"
		})
	);

	const response = await page.request.get(
		`/api/invoices/generate-pdf/${invoice.id}?base64=true`
	);
	expect(response.status()).toBe(200);

	const text = await extractPdfText(await response.text());
	expect(text).toContain(`Participant Number: ${client.number}`);
	expect(text).toContain(`Bill To: ${invoice.billTo}`);

	// The 0136 (group) and 0125 (solo) registration groups derive different
	// travel/transport codes and per-km rates
	expect(text).toContain("04_591_0136_6_1"); // group activity transport
	expect(text).toContain("$0.49/km");
	expect(text).toContain("04_799_0136_6_1"); // group non-labour travel
	// Group provider travel apportions the effective rate by
	// group size (defaults to 2) — testUser's transitRatePerKm is 0.99 (schema
	// default), which coincides with the ABT group rate above.
	expect(text).toContain(`$${floorToCent(0.99 / 2).toFixed(2)}/km`);
	expect(text).toContain("04_799_0125_6_1"); // solo non-labour travel
	expect(text).toContain("$0.99/km"); // testUser's transitRatePerKm (schema default)

	// Non-whole-hour duration formatting and per-minute rounding
	expect(text).toContain("13:20-14:25 (1 hour, 5 mins)");

	// The printed Total equals getTotalCostOfActivities over the same
	// activities — group travel priced at the apportioned rate on both sides.
	expect(text).toContain(`$${expectedPdfTotal.toFixed(2)}`);
});

test("PDF preview dialog renders a canvas", async ({ page }) => {
	// Reuse the rich invoice if the main flow test already seeded it
	const existing = await prisma.invoice.findFirst({
		where: { invoiceNo: "PDF-1" }
	});
	const invoiceId = existing?.id ?? (await createRichInvoice()).invoice.id;

	await page.goto(`/dashboard/invoices/${invoiceId}`);

	await page.getByTestId("pdf-preview-trigger").click();
	await expect(
		page.getByTestId("pdf-preview").locator("canvas").first()
	).toBeVisible({ timeout: 15_000 });
});

test("Unknown invoice id returns 404 from the PDF endpoint", async ({
	page
}) => {
	const response = await page.request.get(
		"/api/invoices/generate-pdf/does-not-exist"
	);
	expect(response.status()).toBe(404);
	expect(await response.text()).toBe("Can't find PDF");
});

test("Non-GET requests to the PDF endpoint return 405", async ({ page }) => {
	const response = await page.request.post(
		"/api/invoices/generate-pdf/does-not-exist"
	);
	expect(response.status()).toBe(405);
	expect(response.headers()["allow"]).toBe("GET");
});
