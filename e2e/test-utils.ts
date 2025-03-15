import prisma from "@/server/prisma";
import { Page } from "@playwright/test";
import { randomUUID } from "crypto";
import { parse } from "date-fns";
import dayjs from "dayjs";
import { randomClient } from "./random/random-client";
import { randomSupportItem } from "./random/random-support-item";

export const testUser = {
	id: "aa550280-2273-4e02-9a92-e0a99b3f67ba",
	name: "Test User",
	email: "test@user.com",
	sessions: {
		create: {
			expires: dayjs().add(1, "month").toDate(),
			sessionToken: randomUUID()
		}
	},
	account: {
		create: {
			type: "oauth",
			provider: "google",
			providerAccountId: randomUUID(),
			access_token: "ggg_zZl1pWIvKkf3UDynZ09zLvuyZsm1yC0YoRPt",
			token_type: "Bearer",
			scope:
				"https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/userinfo.profile"
		}
	}
};

export async function waitForAlert(page: Page, text: string) {
	return await page
		.locator(".Toastify__toast")
		.filter({ hasText: text })
		.getByLabel("close")
		.click();
}

export async function createRandomSupportItem() {
	const supportItem = randomSupportItem();

	return await prisma.supportItem.create({
		data: {
			...supportItem,
			ownerId: testUser.id
		}
	});
}

export async function createRandomClient() {
	const client = randomClient();

	const createdClient = await prisma.client.create({
		data: {
			...client,
			ownerId: testUser.id
		}
	});

	return createdClient;
}

export async function createRandomActivity(
	clientId: string,
	supportItemId: string
) {
	return await prisma.activity.create({
		data: {
			clientId,
			supportItemId,
			date: new Date(),
			startTime: parse("09:15", "HH:mm", new Date()).toISOString(),
			endTime: parse("15:23", "HH:mm", new Date()).toISOString(),
			ownerId: testUser.id
		}
	});
}
