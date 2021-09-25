/* eslint-disable import/no-mutable-exports */
import { Invoice, Prisma, PrismaClient } from "@prisma/client";

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

// Invoices
export const getInvoices = async () => {
	const invoices = await prisma.invoice.findMany();

	return invoices;
};

export const getInvoice = async (
	invoiceId: string,
	include: Prisma.InvoiceInclude
) => {
	const invoice = await prisma.invoice.findFirst({
		where: {
			id: invoiceId,
		},
		include,
	});

	return invoice;
};

export const deleteInvoice = async (invoiceId: string) => {
	const deletedInvoice = await prisma.invoice.delete({
		where: {
			id: invoiceId,
		},
	});

	return deletedInvoice;
};

export const updateInvoice = async (invoice: Invoice) => {
	const updatedInvoice = await prisma.invoice.update({
		where: {
			id: invoice.id,
		},
		data: invoice,
	});

	return updatedInvoice;
};

export const createInvoice = async (invoice: Invoice) => {
	const createdInvoice = await prisma.invoice.create({
		data: invoice,
	});

	return createdInvoice;
};

// Support Items

// Activities

// Templates

// Clients

export const getSupportItems = async () => {};

export const getTemplates = async () => {};

export const getClients = async () => {};

// Helper functions

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
