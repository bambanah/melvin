import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	// Handle GET request
	if (request.method === "GET") {
		const templates = await prisma.template.findMany();

		return response.status(200).json(templates);
	}

	// Handle POST request
	if (request.method === "POST") {
		const session = await getSession({ req: request });
		if (!session) return response.status(401).send("Not authorized.");

		const user = await prisma.user.findFirst({
			where: { email: session.user?.email },
		});

		// Create new support item
		const template = await prisma.template.create({
			data: {
				ownerId: user?.id,
				...request.body,
			},
		});

		return response.status(201).json(template);
	}

	// Unaccepted request method
	return response.status(405).send("Must be either GET or POST");
};
