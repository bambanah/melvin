import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "GET") {
		const invoices = await prisma.invoice.findMany();

		return res.status(200).json(invoices);
	}

	if (req.method === "POST") {
		const invoice = await prisma.invoice.create(req.body);

		return res.status(201).json(invoice);
	}

	return res.status(405).send("Must be either GET or POST");
};
