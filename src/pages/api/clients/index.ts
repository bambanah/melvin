import prisma from "src/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "GET") {
		const clients = await prisma.client.findMany();

		return res.status(200).json(clients);
	}

	if (req.method === "POST") {
		const client = await prisma.client.create(req.body);

		return res.status(201).json(client);
	}

	return res.status(405).send("Must be either GET or POST");
};
