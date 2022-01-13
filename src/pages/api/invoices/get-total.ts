import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@utils/prisma";
import { getTotalCost } from "@utils/helpers";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "GET") {
		const { invoiceId } = req.query;

		const invoice = await prisma.invoice.findFirst({
			where: { id: String(invoiceId) },
			include: {
				activities: {
					include: {
						supportItem: true,
					},
				},
			},
		});

		if (!invoice || !invoice.activities) return [null, null];

		const total = getTotalCost(invoice.activities);

		return res.status(200).send(total);
	}
};
