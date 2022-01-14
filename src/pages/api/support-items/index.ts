import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	// Handle GET request
	if (request.method === "GET") {
		const supportItems = await prisma.supportItem.findMany();

		return response.status(200).json(supportItems);
	}

	// Handle POST request
	if (request.method === "POST") {
		const session = await getSession({ req: request });
		if (!session) return response.status(401).send("Not authorized.");

		const user = await prisma.user.findFirst({
			where: { email: session.user?.email },
		});

		Object.keys(request.body).map((key) => {
			request.body[key] = request.body[key] || undefined;
		});

		// Create new support item
		const supportItem = await prisma.supportItem.create({
			data: {
				ownerId: user?.id,
				...request.body.map((index: unknown) => index || undefined),
			},
		});

		return response.status(201).json(supportItem);
	}

	// Unaccepted request method
	return response.status(405).send("Must be either GET or POST");
};
