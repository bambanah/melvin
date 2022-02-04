import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	const session = await getSession({ req: request });

	if (!session) return response.status(401).send("Not authorized.");

	// Handle GET request
	if (request.method === "GET") {
		const supportItems = await prisma.supportItem.findMany({
			where: { ownerId: session.user.id },
		});

		return response.status(200).json(supportItems);
	}

	// Handle POST request
	if (request.method === "POST") {
		Object.keys(request.body).map((key) => {
			request.body[key] = request.body[key] || undefined;
		});

		// Create new support item
		const supportItem = await prisma.supportItem.create({
			data: {
				ownerId: session.user.id,
				...request.body,
			},
		});

		return response.status(201).json(supportItem);
	}

	// Unaccepted request method
	return response.status(405).send("Must be either GET or POST");
};
