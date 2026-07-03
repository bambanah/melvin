import prisma from "@/server/prisma";
import { expect, test } from "@playwright/test";
import { testUser } from "../test-utils";

/**
 * UI visual regression — runs only in the "visual" Playwright project.
 *
 * Baselines live in e2e/visual/__screenshots__ and are Linux-authoritative:
 * they are generated on ubuntu (CI or the update-snapshots workflow), never
 * on dev machines. All seeds are fixed literals so renders are
 * deterministic; the VIS- invoice-number prefix plus the ?q=VIS- search
 * param isolates these rows from anything created by other specs.
 */

let invoiceId: string;

test.beforeAll(async () => {
	// Idempotent re-seed so repeated local runs don't accumulate rows
	await prisma.invoice.deleteMany({
		where: { invoiceNo: { startsWith: "VIS-" }, ownerId: testUser.id }
	});
	await prisma.supportItem.deleteMany({
		where: {
			description: "Access Community Social and Rec Activ - Standard",
			ownerId: testUser.id
		}
	});
	await prisma.client.deleteMany({
		where: { name: "Visual Test Client", ownerId: testUser.id }
	});

	const client = await prisma.client.create({
		data: { name: "Visual Test Client", ownerId: testUser.id }
	});

	// The community-access item our users actually bill, verbatim from the
	// 22-23 support catalogue
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Access Community Social and Rec Activ - Standard",
			rateType: "HOUR",
			weekdayCode: "04_104_0125_6_1",
			weeknightCode: "04_103_0125_6_1",
			saturdayCode: "04_105_0125_6_1",
			sundayCode: "04_106_0125_6_1",
			weekdayRate: 62.17,
			weeknightRate: 68.5,
			saturdayRate: 87.51,
			sundayRate: 112.85,
			ownerId: testUser.id
		}
	});

	// No sentAt on the detail-page invoice: keeps the page free of dynamic
	// "Sent on" text
	const invoice = await prisma.invoice.create({
		data: {
			invoiceNo: "VIS-1",
			date: new Date("2023-02-01T00:00:00.000Z"),
			status: "CREATED",
			clientId: client.id,
			ownerId: testUser.id,
			activities: {
				create: [
					{
						date: new Date("2023-01-11T00:00:00.000Z"),
						startTime: new Date("1970-01-01T09:00:00.000Z"),
						endTime: new Date("1970-01-01T11:00:00.000Z"),
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: supportItem.id
					}
				]
			}
		}
	});
	invoiceId = invoice.id;

	await prisma.invoice.create({
		data: {
			invoiceNo: "VIS-2",
			date: new Date("2023-02-08T00:00:00.000Z"),
			status: "SENT",
			sentAt: new Date("2023-02-09T00:00:00.000Z"),
			clientId: client.id,
			ownerId: testUser.id
		}
	});

	await prisma.invoice.create({
		data: {
			invoiceNo: "VIS-3",
			date: new Date("2023-02-15T00:00:00.000Z"),
			status: "PAID",
			sentAt: new Date("2023-02-16T00:00:00.000Z"),
			paidAt: new Date("2023-02-20T00:00:00.000Z"),
			clientId: client.id,
			ownerId: testUser.id
		}
	});
});

test("invoice list", async ({ page }) => {
	await page.goto("/dashboard/invoices?q=VIS-");

	await expect(
		page.getByRole("row").filter({ hasText: "VIS-1" })
	).toBeVisible();
	await expect(
		page.getByRole("row").filter({ hasText: "VIS-3" })
	).toBeVisible();

	await expect(page).toHaveScreenshot("invoice-list.png");
});

test("invoice detail page", async ({ page }) => {
	await page.goto(`/dashboard/invoices/${invoiceId}`);

	await expect(page.getByTestId("invoice-total")).toBeVisible();

	await expect(page).toHaveScreenshot("invoice-detail.png");
});

test("create invoice form", async ({ page }) => {
	await page.goto("/dashboard/invoices/create");

	await expect(page.getByLabel("Invoice Number")).toBeVisible();

	await expect(page).toHaveScreenshot("invoice-create-form.png");
});

test("pdf preview dialog", async ({ page }) => {
	await page.goto(`/dashboard/invoices/${invoiceId}`);

	await page.getByTestId("pdf-preview-trigger").click();
	await expect(
		page.getByTestId("pdf-preview").locator("canvas").first()
	).toBeVisible({ timeout: 15_000 });

	await expect(page).toHaveScreenshot("pdf-preview-dialog.png", {
		fullPage: false
	});
});
