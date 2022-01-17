import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	if (request.method === "GET") {
		const { id } = request.query;

		const invoice = await prisma.invoice.findFirst({
			where: { ownerId: String(id) },
			include: {
				activities: true,
				client: true,
			},
			orderBy: {
				created: "desc",
			},
		});

		if (!invoice || !invoice.client || !invoice.activities)
			return response.status(404).send("Not found");

		return response.status(200).json(invoice);
	}
};
