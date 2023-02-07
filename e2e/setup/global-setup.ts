import { chromium } from "@playwright/test";
import prisma from "@utils/prisma";
import path from "node:path";

async function globalSetup() {
	const storagePath = path.resolve(__dirname, "storage-state.json");

	const date = new Date();

	// This is a dummy random session token
	const sessionToken = "04456e41-ec3b-4edf-92c1-48c14e57cacd2";

	// 1. We make sure a test user exists in our local database, `upsert` will make sure we only have this user in our database
	await prisma.user.upsert({
		where: {
			email: "e2e@e2e.com",
		},
		create: {
			name: "e2e",
			email: "e2e@e2e.com",
			// 2. We need a session which is used by NextAuth and represents this `e2e@e2e.com` user login session
			sessions: {
				create: {
					// 2.1. Here we are just making sure the expiration is for a future date, to avoid NextAuth to invalidate our session during the tests
					expires: new Date(date.getFullYear(), date.getMonth() + 1, 0),
					sessionToken,
				},
			},
			// 3. Here we are binding our user with a "Github fake account", this is needed since we are using OAuth, we don't have to worry about this data since we are gonna intercept and mock the direct Github API calls
			accounts: {
				create: {
					type: "oauth",
					provider: "github",
					providerAccountId: "2222222",
					access_token: "ggg_zZl1pWIvKkf3UDynZ09zLvuyZsm1yC0YoRPt",
					token_type: "bearer",
					scope: "read:org,read:user,repo,user:email",
				},
			},
		},
		update: {},
	});

	// 4. Finally we need to set up the authentication cookie into our test browser state
	// This will guarantee you will have an authenticated user once you boot up your tests
	const browser = await chromium.launch();
	const context = await browser.newContext({ storageState: storagePath });
	// 4.1. This cookie is what `NextAuth` will look after to validate if our user is authenticated
	// Please note that the `value` of the cookie **must be the same** as the `sessionToken` we added in `step 2.`
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
