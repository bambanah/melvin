import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	const { id } = request.query;
	const supportItemId = typeof id === "string" ? id : id[0];

	if (request.method === "GET") {
		const supportItem = await prisma.supportItem.findUnique({
			where: {
				id: supportItemId,
			},
		});

		if (!supportItem)
			return response.status(404).send("Can't find support item with that ID");

		return response.status(200).json(supportItem);
	}

	if (request.method === "POST") {
		// Update support item here
		const session = await getSession({ req: request });
		if (!session)
			return response
				.status(401)
				.send("Must be signed in to update this resource.");

		Object.keys(request.body).map((key) => {
			request.body[key] = request.body[key] || undefined;
		});

		const newSupportItem = await prisma.supportItem.update({
			where: {
				id: request.body.id,
			},
			data: request.body,
		});

		return response.json(newSupportItem);
	}

	if (request.method === "DELETE") {
		await prisma.supportItem.delete({
			where: {
				id: supportItemId,
			},
		});

		response.statusCode = 204;
		return response;
	}

	return response.status(405).send("Unsupported method");
};
