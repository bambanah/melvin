import { chromium } from "@playwright/test";
import prisma from "@utils/prisma";
import dayjs from "dayjs";
import fs from "node:fs";
import path from "node:path";

async function globalSetup() {
	const storagePath = path.resolve(__dirname, "storage-state.json");
	fs.access(storagePath, (err) => {
		if (err) {
			const emptyState = {
				cookies: [],
				origins: [],
			};

			fs.writeFile(
				storagePath,
				JSON.stringify(emptyState),
				{ flag: "wx" },
				() => {
					// eslint-disable-next-line no-console
					console.log("Created storage-state.json\n");
				}
			);
		}
	});

	const sessionToken = "e7e59d85-3421-442f-968f-0e7357c96914";

	const user = await prisma.user.upsert({
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

	await prisma.client.deleteMany({ where: { ownerId: user.id } });
	await prisma.supportItem.deleteMany({ where: { ownerId: user.id } });
	await prisma.invoice.deleteMany({ where: { ownerId: user.id } });
	await prisma.activity.deleteMany({ where: { ownerId: user.id } });

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
			expires: dayjs().add(1, "month").unix(),
		},
	]);
	await context.storageState({ path: storagePath });
	await browser.close();
}

export default globalSetup;
