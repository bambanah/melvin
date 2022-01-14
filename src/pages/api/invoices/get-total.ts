import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@utils/prisma";
import { getTotalCost } from "@utils/helpers";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	if (request.method === "GET") {
		const { invoiceId } = request.query;

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

		if (!invoice || !invoice.activities)
			return response.status(404).send("Can't find");

		const total = getTotalCost(invoice.activities);

		return response.status(200).send(total);
	}
};
