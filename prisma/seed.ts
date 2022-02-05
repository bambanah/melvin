import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
const prisma = new PrismaClient();

async function main() {
	const user = await prisma.user.findFirst({
		where: { email: "lachlanu@gmail.com" },
	});

	if (!user) throw new Error("Must create a user first");

	let client = await prisma.client.findFirst({
		where: { ownerId: user.id, name: "John Smith" },
	});
	if (!client) {
		client = await prisma.client.upsert({
			where: { id: "John" },
			create: {
				name: "John Smith",
				number: "123456789",
				ownerId: user.id,
				billTo: "HELP Enterprises",
			},
			update: {},
		});
	}

	let supportItem = await prisma.supportItem.findFirst({
		where: {
			ownerId: user.id,
			description: "Access Community, Social And Rec Activities - Standard",
		},
	});
	if (!supportItem) {
		supportItem = await prisma.supportItem.create({
			data: {
				description: "Access Community, Social And Rec Activities - Standard",
				rateType: "HOUR",
				weekdayCode: "04_104_0125_6_1",
				weekdayRate: 55.47,
				weeknightCode: "04_103_0125_6_1",
				weeknightRate: 61.05,
				saturdayCode: "04_105_0125_6_1",
				saturdayRate: 77.81,
				sundayCode: "04_106_0125_6_1",
				sundayRate: 100.16,
				ownerId: user.id,
			},
		});
	}

	let invoice = await prisma.invoice.findFirst({
		where: { ownerId: user.id, invoiceNo: "Test1" },
	});
	if (!invoice) {
		invoice = await prisma.invoice.create({
			data: {
				invoiceNo: "Test1",
				billTo: "Test Enterprise",
				date: dayjs.utc().toDate(),
				clientId: client.id,
				ownerId: user.id,
				status: "CREATED",
				activities: {
					create: [
						{
							date: dayjs.utc().toDate(),
							startTime: dayjs.utc("1970-01-01T09:00").toDate(),
							endTime: dayjs.utc("1970-01-01T09:30").toDate(),
							supportItemId: supportItem.id,
						},
					],
				},
			},
		});
	}

	let template = await prisma.template.findFirst({
		where: { invoiceId: invoice.id, templateName: "Test Template" },
	});
	if (!template) {
		template = await prisma.template.create({
			data: {
				templateName: "Test Template",
				invoiceId: invoice.id,
			},
		});
	}
}

main()
	.catch((error) => {
		console.error(error);
		throw new Error(error);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
