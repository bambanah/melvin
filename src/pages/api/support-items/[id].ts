import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const { id } = req.query;
	const supportItemId = typeof id === "string" ? id : id[0];

	if (req.method === "GET") {
		const supportItem = await prisma.supportItem.findUnique({
			where: {
				id: supportItemId,
			},
		});

		if (!supportItem)
			return res.status(404).send("Can't find support item with that ID");

		return res.status(200).json(supportItem);
	}

	if (req.method === "PATCH") {
		// Update support item here
		const session = await getSession({ req });
		if (!session)
			return res.status(401).send("Must be signed in to update this resource.");

		const newSupportItem = await prisma.supportItem.update({
			data: req.body.data,
			where: {
				id: req.body.id,
			},
		});

		return res.json(newSupportItem);
	}

	if (req.method === "DELETE") {
		await prisma.supportItem.delete({
			where: {
				id: supportItemId,
			},
		});

		res.statusCode = 204;
		return res;
	}

	return res.status(405).send("Unsupported method");
};
