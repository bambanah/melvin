import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const { id } = req.query;

	const invoiceId = typeof id === "string" ? id : id[0];

	const invoice = await prisma.invoice.findFirst({
		where: {
			id: invoiceId,
		},
	});

	res.statusCode = invoice === null ? 404 : 200;

	return res.json(invoice);
};
