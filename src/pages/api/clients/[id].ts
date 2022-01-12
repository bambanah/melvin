import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const { id } = req.query;
	const clientId = typeof id === "string" ? id : id[0];

	if (req.method === "GET") {
		const client = await prisma.client.findUnique({
			where: {
				id: clientId,
			},
		});

		if (!client) return res.status(404).send("Can't find client with that ID");

		return res.status(200).json(client);
	}

	if (req.method === "POST") {
		const session = await getSession({ req });
		if (!session)
			return res.status(401).send("Must be signed in to update this resource.");

		const newClient = await prisma.client.update({
			data: req.body.data,
			where: {
				id: req.body.id,
			},
		});

		return res.json(newClient);
	}

	if (req.method === "DELETE") {
		await prisma.client.delete({
			where: {
				id: clientId,
			},
		});

		res.statusCode = 204;
		return res;
	}

	return res.status(405).send("Unsupported method");
};
