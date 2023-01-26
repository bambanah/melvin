import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	const session = await getSession({ req: request });

	if (!session || !session.user?.email)
		return response
			.status(401)
			.send("Must be signed in to update this resource.");

	if (request.method === "POST") {
		const invoice = await prisma.invoice.create({
			data: {
				...request.body.invoice,
				ownerId: session.user.id,
				activities: {
					createMany: {
						data: request.body.activities,
					},
				},
			},
			include: {
				activities: true,
			},
		});

		return response.status(201).json(invoice);
	}

	return response.status(405).send("Must be either GET or POST");
};
