import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const { id } = req.query;
	const invoiceId = typeof id === "string" ? id : id[0];

	if (req.method === "GET") {
		const invoice = await prisma.invoice.findFirst({
			where: {
				id: invoiceId,
			},
		});

		if (!invoice)
			return res.status(404).send("Can't find invoice with that ID");

		return res.status(200).json(invoice);
	}

	if (req.method === "PATCH") {
		const session = await getSession({ req });
		if (!session)
			return res.status(401).send("Must be signed in to update this resource.");

		const newInvoice = await prisma.invoice.update({
			data: req.body.data,
			where: {
				id: req.body.id,
			},
		});

		return res.json(newInvoice);
	}

	if (req.method === "DELETE") {
		await prisma.invoice.delete({
			where: {
				id: invoiceId,
			},
		});

		res.statusCode = 204;
		return res;
	}

	return res.status(405).send("Unsupported method");
};
