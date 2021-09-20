/* eslint-disable import/no-mutable-exports */
import { PrismaClient } from "@prisma/client";

declare global {
	namespace NodeJS {
		interface Global {
			prisma: PrismaClient;
		}
	}
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
	prisma = new PrismaClient();
} else {
	if (!global.prisma) {
		global.prisma = new PrismaClient();
	}
	prisma = global.prisma;
}
export default prisma;

export const getLastInvoiceDetails = async () => {
	const invoice = await prisma.invoice.findFirst({
		orderBy: {
			created: "desc",
		},
		include: {
			activities: true,
		},
	});

	return invoice;
};

export const getHighestInvoiceNumber = async () => {
	const highest = 10;

	return highest;
};
