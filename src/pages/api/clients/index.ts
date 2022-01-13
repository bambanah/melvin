import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const session = await getSession({ req });
	if (!session || !session.user?.email)
		return res.status(401).send("Must be signed in to update this resource.");

	if (req.method === "GET") {
		const clients = await prisma.client.findMany({
			where: {
				ownerId: session.user.id,
			},
			include: {
				invoices: {
					select: {
						invoiceNo: true,
						billTo: true,
					},
				},
			},
		});

		return res.status(200).json(clients);
	}

	if (req.method === "POST") {
		const user = await prisma.user.findUnique({
			where: {
				email: session.user?.email,
			},
		});
		if (!user) {
			return res.status(401).send("Can't find signed in user.");
		}

		req.body.ownerId ??= user?.id;

		const client = await prisma.client.create({ data: req.body });

		return res.status(201).json(client);
	}

	return res.status(405).send("Must be either GET or POST");
};
