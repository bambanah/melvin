import prisma from "@/server/prisma";
import { expect, test } from "@playwright/test";
import { randomInvoice } from "./random/random-invoice";
import {
	createRandomActivity,
	createRandomClient,
	createRandomSupportItem,
	testUser,
	waitForAlert
} from "./test-utils";

/** Seeds a draft invoice holding one timed activity, directly via Prisma. */
async function seedDraftInvoice() {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	const activity = await createRandomActivity(client.id, supportItem.id, {
		startTime: "09:00",
		endTime: "10:00"
	});

	const invoice = await prisma.invoice.create({
		data: {
			invoiceNo: randomInvoice().invoiceNo,
			date: new Date(),
			clientId: client.id,
			ownerId: testUser.id,
			activities: { connect: { id: activity.id } }
		}
	});

	return { invoice, client, supportItem };
}

test("Can delete a draft invoice from its detail page", async ({ page }) => {
	const { invoice } = await seedDraftInvoice();

	await page.goto(`/dashboard/invoices/${invoice.id}`);
	await expect(
		page.getByRole("heading", { name: invoice.invoiceNo, exact: true })
	).toBeVisible();

	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("button", { name: "Invoice actions" }).click();
	await page.getByRole("menuitem", { name: "Delete" }).click();

	await waitForAlert(page, "Invoice deleted");
	await expect(page).toHaveURL("/dashboard/invoices");
	await expect(
		page.getByRole("row").filter({ hasText: invoice.invoiceNo })
	).toHaveCount(0);
});

test("Can mark a paid invoice as unpaid from its detail page", async ({
	page
}) => {
	const { invoice } = await seedDraftInvoice();

	await page.goto(`/dashboard/invoices/${invoice.id}`);
	await page.getByRole("button", { name: "Mark as Sent" }).click();
	await page.getByRole("button", { name: "Mark as Paid" }).click({
		timeout: 10000
	});

	// Paid: Amend is the primary button, Mark as unpaid lives in the overflow
	await expect(page.getByRole("button", { name: "Amend" })).toBeVisible({
		timeout: 10000
	});
	await page.getByRole("button", { name: "Invoice actions" }).click();
	await page.getByRole("menuitem", { name: "Mark as unpaid" }).click();

	await expect(page.getByRole("button", { name: "Mark as Paid" })).toBeVisible({
		timeout: 10000
	});
});

test("Invoice activities are visible on a phone-sized viewport", async ({
	page
}) => {
	const { invoice, supportItem } = await seedDraftInvoice();

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`/dashboard/invoices/${invoice.id}`);

	await expect(
		page.getByRole("heading", { name: "Activities · 1" })
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: supportItem.description })
	).toBeVisible();
});
