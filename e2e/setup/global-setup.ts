import { chromium } from "@playwright/test";
import prisma from "@utils/prisma";
import dayjs from "dayjs";
import path from "node:path";

async function globalSetup() {
	const storagePath = path.resolve(__dirname, "storage-state.json");

	const sessionToken = "e7e59d85-3421-442f-968f-0e7357c96914";

	await prisma.user.upsert({
		where: {
			email: "test@user.com",
		},
		create: {
			name: "test user",
			email: "test@user.com",
			sessions: {
				create: {
					expires: dayjs().add(1, "month").toDate(),
					sessionToken,
				},
			},
			account: {
				create: {
					type: "oauth",
					provider: "google",
					providerAccountId: "123456789123456789123",
					access_token: "ggg_zZl1pWIvKkf3UDynZ09zLvuyZsm1yC0YoRPt",
					token_type: "Bearer",
					scope:
						"https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/userinfo.profile",
				},
			},
		},
		update: {},
	});

	const browser = await chromium.launch();
	const context = await browser.newContext({ storageState: storagePath });

	await context.addCookies([
		{
			name: "next-auth.session-token",
			value: sessionToken,
			domain: "localhost",
			path: "/",
			httpOnly: true,
			sameSite: "Lax",
			expires: 1_661_406_204,
		},
	]);
	await context.storageState({ path: storagePath });
	await browser.close();
}

export default globalSetup;
