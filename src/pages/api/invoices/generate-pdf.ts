import generatePDF from "@utils/pdf-generation";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@utils/prisma";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	if (request.method === "GET") {
		const { invoiceId } = request.query;

		const invoice = await prisma.invoice.findFirst({
			where: { id: String(invoiceId) },
			include: {
				client: true,
				activities: {
					include: {
						supportItem: true,
					},
				},
			},
		});

		if (!invoice || !invoice.client || !invoice.activities)
			return response.status(404).send("Not found");

		const { pdfString, fileName } = await generatePDF(invoice);

		if (!pdfString) {
			return response.status(404).send("Can't find PDF");
		}

		return response
			.status(200)
			.setHeader("Content-Type", "application/pdf")
			.setHeader("Content-Disposition", `inline; filename="${fileName}"`)
			.send(pdfString);
	}
};
