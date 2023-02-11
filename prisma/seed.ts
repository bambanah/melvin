import { InvoiceStatus, PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import { randomClient } from "../e2e/random/random-client";
import { randomInvoice } from "../e2e/random/random-invoice";
import { randomSupportItem } from "../e2e/random/random-support-item";
dayjs.extend(utc);
dayjs.extend(customParseFormat);
const prisma = new PrismaClient();

async function main() {
	const seedEmail = process.env.SEED_EMAIL;

	if (!seedEmail) {
		console.error(
			'\nUnable to seed database. Please provide an email to use for seeding with the "SEED_EMAIL" environment variable.'
		);
		return;
	}

	await prisma.user.deleteMany({
		where: { email: seedEmail },
	});
	const user = await prisma.user.create({
		data: {
			email: seedEmail,
		},
	});

	const clientsToCreate = 10;
	for (let i = 0; i < clientsToCreate; i++) {
		await prisma.client.create({
			data: { ...randomClient(), ownerId: user.id },
		});
	}

	const supportItemsToCreate = 10;
	for (let i = 0; i < supportItemsToCreate; i++) {
		await prisma.supportItem.create({
			data: { ...randomSupportItem(), ownerId: user.id },
		});
	}

	const invoicesToCreate = 10;
	for (let i = 0; i < invoicesToCreate; i++) {
		const clientCount = await prisma.client.count();
		const client = await prisma.client.findFirst({
			take: 1,
			skip: Math.floor(Math.random() * clientCount),
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
			},
		});
		if (!client) continue;

		const supportItemCount = await prisma.supportItem.count();
		const supportItem = await prisma.supportItem.findFirst({
			take: 1,
			skip: Math.floor(Math.random() * supportItemCount),
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
			},
		});
		if (!supportItem) continue;

		const invoice = randomInvoice({
			supportItemId: supportItem.id,
			ownerId: user.id,
			clientId: client.id,
		});
		const invoiceStatuses = Object.values(InvoiceStatus);

		await prisma.invoice.create({
			data: {
				...invoice,
				ownerId: user.id,
				date: dayjs().toDate(),
				clientId: client.id,
				status:
					invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)],
				activities: {
					create: invoice.activities.map((activity) => ({
						...activity,
						date: dayjs(activity.date, "YYYY-MM-DD").toDate(),
						startTime: dayjs(activity.startTime, "HH:mm").toDate(),
						endTime: dayjs(activity.endTime, "HH:mm").toDate(),
						transitDistance: Number(activity.transitDistance),
						transitDuration: Number(activity.transitDuration),
					})),
				},
			},
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
