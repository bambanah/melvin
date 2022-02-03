import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	const session = await getSession({ req: request });

	if (!session || !session.user?.email)
		return response
			.status(401)
			.send("Must be signed in to update this resource.");

	if (request.method === "GET") {
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

		return response.status(200).json(clients);
	}

	if (request.method === "POST") {
		request.body.ownerId ??= session.user.id;

		const client = await prisma.client.create({ data: request.body });

		return response.status(201).json(client);
	}

	return response.status(405).send("Must be either GET or POST");
};
