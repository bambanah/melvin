import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "GET") {
		const invoices = await prisma.invoice.findMany({
			include: {
				client: true,
				activities: true,
			},
		});

		return res.status(200).json(invoices);
	}

	if (req.method === "POST") {
		const session = await getSession({ req });

		const owner = await prisma.user.findUnique({
			where: {
				id: session?.user.id,
			},
		});

		const invoice = await prisma.invoice.create({
			data: {
				...req.body.invoice,
				ownerId: owner?.id,
				activities: {
					createMany: {
						data: req.body.activities,
					},
				},
			},
			include: {
				activities: true,
			},
		});

		return res.status(201).json(invoice);
	}

	return res.status(405).send("Must be either GET or POST");
};
