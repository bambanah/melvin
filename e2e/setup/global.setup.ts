import prisma from "@/server/prisma";
import { FullConfig, chromium } from "@playwright/test";
import dayjs from "dayjs";
import { testUser } from "e2e/test-utils";

async function globalSetup(config: FullConfig) {
	const { baseURL, storageState } = config.projects[0].use;

	await prisma.user.deleteMany({ where: { email: testUser.email } });
	const user = await prisma.user.create({
		data: testUser,
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
			expires: dayjs().add(1, "month").unix(),
		},
	]);

	await page.context().storageState({ path: storageState as string });

	await browser.close();

	const globalTeardown = async () => {
		await prisma.user.delete({ where: { id: user.id } });
	};

	return globalTeardown;
}

export default globalSetup;
