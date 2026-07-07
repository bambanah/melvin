import "dotenv/config";
import prisma from "@/server/prisma";
import { FullConfig, chromium } from "@playwright/test";
import { addMonths, getUnixTime } from "date-fns";
import { testUser } from "../test-utils";

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
	await prisma.user.create({
		data: testUser
	});

	const browser = await chromium.launch();
	const page = await browser.newPage();
	await page.goto(baseURL!);

	await page.context().addCookies([
		{
			name: "next-auth.session-token",
			value: testUser.sessions.create.sessionToken,
			domain: "localhost",
			path: "/",
			httpOnly: true,
			sameSite: "Lax",
			expires: getUnixTime(addMonths(new Date(), 1))
		}
	]);

	await page.context().storageState({ path: storageState as string });

	await browser.close();

	const globalTeardown = async () => {
		await deleteTestUserAndData(testUser.email);
	};

	return globalTeardown;
}

export default globalSetup;
