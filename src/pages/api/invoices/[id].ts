import { Activity, Invoice } from "@prisma/client";
import prisma from "@utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

interface ApiRequest extends NextApiRequest {
	body: {
		invoice?: Partial<Invoice>;
		activities?: Activity[];
	};
}

export default async (req: ApiRequest, res: NextApiResponse) => {
	const { id } = req.query;
	const invoiceId = typeof id === "string" ? id : id[0];

	if (req.method === "GET") {
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
			return res.status(404).send("Can't find invoice with that ID");

		return res.status(200).json(invoice);
	}

	if (req.method === "POST") {
		const session = await getSession({ req });
		if (!session)
			return res.status(401).send("Must be signed in to update this resource.");

		if (!req.body.invoice || !req.body.activities) {
			return res.status(402).send("Not enough info");
		}

		const collection = await prisma.$transaction([
			prisma.invoice.update({
				where: { id: String(id) },
				data: { ...req.body.invoice },
			}),
			...req.body.activities?.map((activity) =>
				prisma.activity.upsert({
					where: { id: activity.id },
					update: {
						...activity,
					},
					create: {
						...activity,
						invoiceId: String(id),
					},
				})
			),
		]);

		return res.json(collection);
	}

	if (req.method === "DELETE") {
		await prisma.invoice.delete({
			where: {
				id: invoiceId,
			},
		});

		return res.status(204).end();
	}

	return res.status(405).send("Unsupported method");
};
