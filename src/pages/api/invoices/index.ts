import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	if (request.method === "GET") {
		const invoices = await prisma.invoice.findMany({
			include: {
				client: true,
				activities: {
					select: {
						startTime: true,
						endTime: true,
						transitDistance: true,
						transitDuration: true,
						date: true,
						supportItem: true,
					},
				},
			},
			orderBy: {
				created: "desc",
			},
		});

		return response.status(200).json(invoices);
	}

	if (request.method === "POST") {
		const session = await getSession({ req: request });

		const owner = await prisma.user.findUnique({
			where: {
				id: session?.user.id,
			},
		});

		const invoice = await prisma.invoice.create({
			data: {
				...request.body.invoice,
				ownerId: owner?.id,
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
