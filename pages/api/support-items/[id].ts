import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const { id } = req.query;

	const supportItemId = typeof id === "string" ? id : id[0];

	const supportItem = await prisma.supportItem.findFirst({
		where: {
			id: supportItemId,
		},
	});

	res.statusCode = supportItem === null ? 404 : 200;

	return res.json(supportItem);
};
