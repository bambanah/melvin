import "dotenv/config";
import prisma from "@/server/prisma";
import { FullConfig, chromium } from "@playwright/test";
import { createSignInableUser, signIn, testUser } from "../test-utils";

/**
 * `InvoiceVersion.invoiceId` is `onDelete: Restrict` (docs/adr/0004) — a
 * user with any sent invoice can't cascade-delete, so wipe versions first.
 */
async function deleteTestUserAndData(email: string) {
	const invoices = await prisma.invoice.findMany({
		where: { owner: { email } },
		select: { id: true }
	});

	if (invoices.length > 0) {
		await prisma.invoiceVersion.deleteMany({
			where: { invoiceId: { in: invoices.map((invoice) => invoice.id) } }
		});
	}

	await prisma.user.deleteMany({ where: { email } });
}

async function globalSetup(config: FullConfig) {
	const { baseURL, storageState } = config.projects[0].use;

	await deleteTestUserAndData(testUser.email);
	await createSignInableUser(testUser);

	const browser = await chromium.launch();
	const page = await browser.newPage();

	await signIn(page, testUser.email, baseURL!);

	await page.context().storageState({ path: storageState as string });

	await browser.close();

	const globalTeardown = async () => {
		await deleteTestUserAndData(testUser.email);
	};

	return globalTeardown;
}

export default globalSetup;
