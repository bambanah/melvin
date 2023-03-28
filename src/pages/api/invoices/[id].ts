import { Activity, Invoice } from "@prisma/client";
import prisma from "@server/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

interface ApiRequest extends NextApiRequest {
	body: {
		invoice?: Partial<Invoice>;
		activities?: Activity[];
		activitiesToDelete?: string[];
	};
}

export default async (request: ApiRequest, response: NextApiResponse) => {
	const { id } = request.query;
	const invoiceId = id ? (typeof id === "string" ? id : id[0]) : undefined;

	if (invoiceId === undefined)
		return response.status(400).send("No invoice ID provided.");

	if (request.method === "POST") {
		const session = await getSession({ req: request });
		if (!session)
			return response
				.status(401)
				.send("Must be signed in to update this resource.");

		if (
			!request.body.invoice ||
			!request.body.activities ||
			!request.body.activitiesToDelete
		) {
			return response.status(402).send("Not enough info");
		}
		const collection = await prisma.$transaction([
			prisma.invoice.update({
				where: { id: invoiceId },
				data: { ...request.body.invoice },
			}),
			...request.body.activities?.map((activity) =>
				prisma.activity.upsert({
					where: { id: activity.id ?? "" },
					update: {
						...activity,
					},
					create: {
						...activity,
						invoiceId,
					},
				})
			),
			...request.body.activitiesToDelete?.map((id) =>
				prisma.activity.delete({ where: { id } })
			),
		]);

		return response.json(collection);
	}

	if (request.method === "GET") {
		const invoice = await prisma.invoice.findUnique({
			where: {
				id: invoiceId,
			},
			include: {
				activities: {
					include: {
						supportItem: true,
					},
				},
			},
		});

		if (!invoice)
			return response.status(404).send("Can't find invoice with that ID");

		return response.status(200).json(invoice);
	}

	if (request.method === "DELETE") {
		await prisma.invoice.delete({
			where: {
				id: invoiceId,
			},
		});

		return response.status(204).end();
	}

	return response.status(405).send("Unsupported method");
};
