import { getTotalCostOfActivities } from "@/lib/activity-utils";
import prisma from "@/server/prisma";
import { Page } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import { randomClient } from "./random/random-client";
import { randomSupportItem } from "./random/random-support-item";

export const testUser = {
	id: "aa550280-2273-4e02-9a92-e0a99b3f67ba",
	name: "Test User",
	email: "test@user.com",
	// Payment details: the PDF footer only renders when all five of
	// name/abn/bankName/bsb/bankNumber are present
	abn: BigInt("12345678901"),
	bankName: "Test Bank",
	bsb: 123456,
	bankNumber: BigInt("987654321"),
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

export async function createDefaultSupportItem() {
	const supportItem = await createRandomSupportItem();

	await prisma.user.update({
		where: { id: testUser.id },
		data: { defaultSupportItemId: supportItem.id }
	});

	return supportItem;
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

/**
 * Seeds a fixed-content invoice exercising every PDF pricing branch: custom
 * client rates, provider travel, activity based transport, and a KM item.
 *
 * Everything is written directly via Prisma — the invoice-create UI path
 * cannot persist transport items (invoice-schema's `activitiesToCreate`
 * omits them), so seeding through the UI is not an option.
 */
export async function createRichInvoice() {
	const client = await prisma.client.create({
		data: {
			name: "PDF Test Client",
			number: "431111111",
			ownerId: testUser.id
		}
	});

	// The two support items our users actually bill, verbatim from the
	// bundled support catalogue: the solo community-access item plus its
	// activity transport companion
	const hourItem = await prisma.supportItem.create({
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
			ownerId: testUser.id,
			supportItemRates: {
				create: {
					ownerId: testUser.id,
					clientId: client.id,
					saturdayRate: 80
				}
			}
		}
	});

	const kmItem = await prisma.supportItem.create({
		data: {
			description: "Activity Based Transport",
			rateType: "KM",
			weekdayCode: "04_590_0125_6_1",
			weekdayRate: 0.97,
			ownerId: testUser.id
		}
	});

	const invoice = await prisma.invoice.create({
		data: {
			invoiceNo: "PDF-1",
			billTo: "PDF Test Plan Managers",
			date: new Date("2023-02-01T00:00:00.000Z"),
			clientId: client.id,
			ownerId: testUser.id,
			activities: {
				create: [
					{
						// Wednesday, with provider travel and transport items
						date: new Date("2023-01-11T00:00:00.000Z"),
						startTime: new Date("1970-01-01T09:00:00.000Z"),
						endTime: new Date("1970-01-01T11:00:00.000Z"),
						transitDuration: 30,
						transitDistance: 15,
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: hourItem.id,
						transportItems: {
							create: [
								{ type: "DISTANCE", amount: 10 },
								{ type: "PARKING", amount: 8.5, note: "Hospital car park" }
							]
						}
					},
					{
						// Saturday — the client-specific rate override applies
						date: new Date("2023-01-14T00:00:00.000Z"),
						startTime: new Date("1970-01-01T09:00:00.000Z"),
						endTime: new Date("1970-01-01T11:00:00.000Z"),
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: hourItem.id
					},
					{
						// KM-rate item: no start/end times, distance only
						date: new Date("2023-01-12T00:00:00.000Z"),
						itemDistance: 34,
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: kmItem.id
					}
				]
			}
		},
		include: {
			client: true,
			activities: {
				include: {
					supportItem: { include: { supportItemRates: true } },
					transportItems: true
				}
			}
		}
	});

	// What generatePDF prints as Total (custom rates + transport included).
	// testUser has no transitRatePerKm override, so it resolves to the
	// schema default (0.99) — mirror that here since generatePDF now threads
	// the owner's rate through non-group Provider Travel.
	const expectedPdfTotal = getTotalCostOfActivities(invoice.activities, {
		userTransitRatePerKm: 0.99
	});

	// What the invoice page shows: the byId query selects neither
	// supportItemRates nor transportItems, so its total omits custom rates
	// and transport costs — an intentional snapshot of current behavior
	const expectedPageTotal = getTotalCostOfActivities(
		invoice.activities.map((activity) => ({
			...activity,
			transportItems: [],
			supportItem: { ...activity.supportItem, supportItemRates: [] }
		}))
	);

	return {
		invoice,
		client,
		hourItem,
		kmItem,
		expectedPdfTotal,
		expectedPageTotal
	};
}

/**
 * Seeds an invoice modelled on a real (de-identified) plan-managed invoice —
 * the same shape as the `plan-managed-week` fixture in
 * src/lib/testing/invoice-fixtures.ts: a group session whose 0136
 * registration group derives group travel/transport codes and rates, solo
 * sessions on 0125 codes, non-whole-hour durations, provider travel, and
 * activity transport. All names, numbers, and the plan manager are fictional;
 * codes, rates, durations, and distances match the original invoice.
 */
export async function createRealisticInvoice() {
	const client = await prisma.client.create({
		data: {
			name: "Casey Citizen",
			number: "430123456",
			ownerId: testUser.id
		}
	});

	const communityItem = await prisma.supportItem.create({
		data: {
			description: "Access Community Social and Rec Activ - Standard",
			rateType: "HOUR",
			weekdayCode: "04_104_0125_6_1",
			weeknightCode: "04_103_0125_6_1",
			saturdayCode: "04_105_0125_6_1",
			sundayCode: "04_106_0125_6_1",
			weekdayRate: 70.23,
			weeknightRate: 77.38,
			saturdayRate: 98.83,
			sundayRate: 126.31,
			ownerId: testUser.id
		}
	});

	const groupItem = await prisma.supportItem.create({
		data: {
			description: "Group Activities - Standard",
			rateType: "HOUR",
			isGroup: true,
			weekdayCode: "04_102_0136_6_1",
			// Full-session rate (docs/plans/016): billing apportions this by the
			// activity's groupSize (defaults to 2), reproducing the original
			// per-participant rate of 35.10.
			weekdayRate: 70.2,
			ownerId: testUser.id
		}
	});

	const invoice = await prisma.invoice.create({
		data: {
			invoiceNo: "PDF-REAL-1",
			billTo: "Banksia Plan Management",
			date: new Date("2023-06-25T00:00:00.000Z"),
			clientId: client.id,
			ownerId: testUser.id,
			activities: {
				create: [
					{
						// Tuesday group session (1 hour, 20 mins) with provider travel
						// and activity transport billed at the group rates
						date: new Date("2023-06-20T00:00:00.000Z"),
						startTime: new Date("1970-01-01T12:00:00.000Z"),
						endTime: new Date("1970-01-01T13:20:00.000Z"),
						transitDuration: 25,
						transitDistance: 13,
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: groupItem.id,
						transportItems: { create: [{ type: "DISTANCE", amount: 30 }] }
					},
					{
						// Tuesday solo session, odd duration (1 hour, 5 mins)
						date: new Date("2023-06-20T00:00:00.000Z"),
						startTime: new Date("1970-01-01T13:20:00.000Z"),
						endTime: new Date("1970-01-01T14:25:00.000Z"),
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: communityItem.id
					},
					{
						// Thursday long session (5 hours, 30 mins)
						date: new Date("2023-06-22T00:00:00.000Z"),
						startTime: new Date("1970-01-01T09:00:00.000Z"),
						endTime: new Date("1970-01-01T14:30:00.000Z"),
						transitDuration: 30,
						transitDistance: 26,
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: communityItem.id,
						transportItems: { create: [{ type: "DISTANCE", amount: 46 }] }
					},
					{
						// Saturday early start (4 hours, 5 mins) at the saturday rate
						date: new Date("2023-06-24T00:00:00.000Z"),
						startTime: new Date("1970-01-01T06:15:00.000Z"),
						endTime: new Date("1970-01-01T10:20:00.000Z"),
						transitDuration: 30,
						transitDistance: 26,
						ownerId: testUser.id,
						clientId: client.id,
						supportItemId: communityItem.id,
						transportItems: { create: [{ type: "DISTANCE", amount: 32 }] }
					}
				]
			}
		},
		include: {
			client: true,
			activities: {
				include: {
					supportItem: { include: { supportItemRates: true } },
					transportItems: true
				}
			}
		}
	});

	// Same page-total vs PDF-total split as createRichInvoice: the byId query
	// omits transportItems, so the page total excludes transport costs.
	// testUser's transitRatePerKm resolves to the schema default (0.99).
	const expectedPdfTotal = getTotalCostOfActivities(invoice.activities, {
		userTransitRatePerKm: 0.99
	});
	const expectedPageTotal = getTotalCostOfActivities(
		invoice.activities.map((activity) => ({
			...activity,
			transportItems: [],
			supportItem: { ...activity.supportItem, supportItemRates: [] }
		}))
	);

	return { invoice, client, expectedPdfTotal, expectedPageTotal };
}

export async function createRandomActivity(
	clientId: string,
	supportItemId: string,
	times?: { startTime: string; endTime: string }
) {
	const startTime = times?.startTime ?? "09:15";
	const endTime = times?.endTime ?? "10:00";

	return await prisma.activity.create({
		data: {
			clientId,
			supportItemId,
			date: new Date(),
			// Stored as epoch-date UTC times (like every other activity fixture
			// in this file) — parsing "HH:mm" against a local `new Date()` and
			// converting to ISO shifts the date under UTC+ timezones (e.g.
			// AEST), which can wrap a same-day range into a reversed one.
			startTime: new Date(`1970-01-01T${startTime}:00.000Z`),
			endTime: new Date(`1970-01-01T${endTime}:00.000Z`),
			ownerId: testUser.id
		}
	});
}
