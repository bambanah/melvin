import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	// Handle GET request
	if (req.method === "GET") {
		const templates = await prisma.template.findMany();

		return res.status(200).json(templates);
	}

	// Handle POST request
	if (req.method === "POST") {
		const session = await getSession({ req });
		if (!session) return res.status(401).send("Not authorized.");

		const user = await prisma.user.findFirst({
			where: { email: session.user?.email },
		});

		// Create new support item
		const template = await prisma.template.create({
			data: {
				ownerId: user?.id,
				...req.body,
			},
		});

		return res.status(201).json(template);
	}

	// Unaccepted request method
	return res.status(405).send("Must be either GET or POST");
};
