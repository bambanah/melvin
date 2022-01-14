import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	const { id } = request.query;
	const templateId = typeof id === "string" ? id : id[0];

	if (request.method === "GET") {
		const template = await prisma.template.findUnique({
			where: {
				id: templateId,
			},
		});

		if (!template)
			return response.status(404).send("Can't find template with that ID");

		return response.status(200).json(template);
	}

	if (request.method === "PATCH") {
		const session = await getSession({ req: request });
		if (!session)
			return response
				.status(401)
				.send("Must be signed in to update this resource.");

		const newTemplate = await prisma.template.update({
			data: request.body.data,
			where: {
				id: request.body.id,
			},
		});

		return response.json(newTemplate);
	}

	if (request.method === "DELETE") {
		await prisma.template.delete({
			where: {
				id: templateId,
			},
		});

		response.statusCode = 204;
		return response;
	}

	return response.status(405).send("Unsupported method");
};
