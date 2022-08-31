import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	const { id } = request.query;
	const clientId = id ? (typeof id === "string" ? id : id[0]) : undefined;

	if (clientId === undefined)
		return response.status(400).send("No client ID provided.");

	if (request.method === "POST") {
		const session = await getSession({ req: request });
		if (!session)
			return response
				.status(401)
				.send("Must be signed in to update this resource.");

		const newClient = await prisma.client.update({
			where: {
				id: clientId,
			},
			data: request.body,
		});

		return response.json(newClient);
	}

	if (request.method === "GET") {
		const client = await prisma.client.findUnique({
			where: {
				id: clientId,
			},
		});

		if (!client)
			return response.status(404).send("Can't find client with that ID");

		return response.status(200).json(client);
	}

	if (request.method === "DELETE") {
		await prisma.client.delete({
			where: {
				id: clientId,
			},
		});

		return response.status(204).end();
	}

	return response.status(405).send("Unsupported method");
};
