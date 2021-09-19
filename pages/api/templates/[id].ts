import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const { id } = req.query;

	const templateId = typeof id === "string" ? id : id[0];

	const template = await prisma.template.findFirst({
		where: {
			id: templateId,
		},
	});

	res.statusCode = template === null ? 404 : 200;

	return res.json(template);
};
