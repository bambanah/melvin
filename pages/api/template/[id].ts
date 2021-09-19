import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const { id } = req.query;
	const templateId = typeof id === "string" ? id : id[0];

	if (req.method === "GET") {
		const template = await prisma.template.findFirst({
			where: {
				id: templateId,
			},
		});

		if (!template)
			return res.status(404).send("Can't find template with that ID");

		return res.status(200).json(template);
	}

	if (req.method === "PATCH") {
		const session = await getSession({ req });
		if (!session)
			return res.status(401).send("Must be signed in to update this resource.");

		const newTemplate = await prisma.template.update({
			data: req.body.data,
			where: {
				id: req.body.id,
			},
		});

		return res.json(newTemplate);
	}

	if (req.method === "DELETE") {
		await prisma.template.delete({
			where: {
				id: templateId,
			},
		});

		res.statusCode = 204;
		return res;
	}

	return res.status(405).send("Unsupported method");
};
