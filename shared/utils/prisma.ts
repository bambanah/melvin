/* eslint-disable import/no-mutable-exports */
import {
	PrismaClient,
} from "@prisma/client";

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

// ----- Core functions -----

export const getHighestInvoiceNumber = async () => {
	const highest = 10;

	return highest;
};
