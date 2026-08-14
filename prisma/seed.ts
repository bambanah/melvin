import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { randomClient } from "../e2e/random/random-client";
import { randomInvoice } from "../e2e/random/random-invoice";
import { PrismaClient, InvoiceStatus } from "@/generated/client";
import { parseUtcTime, utcDate } from "@/lib/date-utils";
import { placeholderName } from "@/lib/placeholder-name";

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

/** Local dev only - there is nothing to protect in a seeded database. */
const SEED_PASSWORD = "password";

async function main() {
	const seedEmail = process.env.SEED_EMAIL;

	if (!seedEmail) {
		console.error(
			'\nUnable to seed database. Please provide an email to use for seeding with the "SEED_EMAIL" environment variable.'
		);
		return;
	}

	await prisma.user.deleteMany({
		where: { email: seedEmail }
	});
	const user = await prisma.user.create({
		data: {
			email: seedEmail,
			name: placeholderName(seedEmail),
			// `requireEmailVerification` would otherwise reject the sign-in.
			emailVerified: true
		}
	});

	await prisma.account.create({
		data: {
			userId: user.id,
			// better-auth keys password accounts by provider "credential", with
			// the user's own id as the account id.
			providerId: "credential",
			accountId: user.id,
			password: await hashPassword(SEED_PASSWORD)
		}
	});

	const clientsToCreate = 2;
	for (let i = 0; i < clientsToCreate; i++) {
		await prisma.client.create({
			data: { ...randomClient(), ownerId: user.id }
		});
	}

	const supportItem = await prisma.supportItem.create({
		data: {
			ownerId: user.id,
			description: "Access Community Social and Rec Activ - Standard",
			weekdayCode: "04_104_0125_6_1",
			weekdayRate: 67.56,
			weeknightCode: "04_103_0125_6_1",
			weeknightRate: 74.44,
			saturdayCode: "04_105_0125_6_1",
			saturdayRate: 95.07,
			sundayCode: "04_106_0125_6_1",
			sundayRate: 122.59
		}
	});

	const invoicesToCreate = 10;
	for (let i = 0; i < invoicesToCreate; i++) {
		const clientCount = await prisma.client.count();
		const client = await prisma.client.findFirst({
			take: 1,
			skip: Math.floor(Math.random() * clientCount),
			orderBy: { createdAt: "asc" }
		});
		if (!client) continue;

		const invoice = randomInvoice({
			supportItemId: supportItem.id,
			ownerId: user.id,
			clientId: client.id
		});
		const invoiceStatuses = Object.values(InvoiceStatus);

		await prisma.invoice.create({
			data: {
				...invoice,
				ownerId: user.id,
				date: new Date(),
				clientId: client.id,
				status:
					invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)],
				activities: {
					create: invoice.activities.map((activity) => ({
						...activity,
						date: utcDate(activity.date),
						startTime: parseUtcTime(activity.startTime),
						endTime: parseUtcTime(activity.endTime),
						transitDistance: Number(activity.transitDistance),
						transitDuration: Number(activity.transitDuration)
					}))
				}
			}
		});
	}
}

main()
	.catch((error) => {
		console.error(error);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
