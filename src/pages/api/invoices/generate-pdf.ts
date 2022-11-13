import generatePDF from "@utils/pdf-generation";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@utils/prisma";
import Invoice from "types/invoice";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	if (request.method === "GET") {
		const { invoiceId, base64 } = request.query;

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

		const { pdfString, fileName } = await generatePDF(
			invoice as unknown as Invoice
		);

		if (!pdfString) {
			return response.status(404).send("Can't find PDF");
		}

		if (base64 === "true") {
			return response
				.status(200)
				.setHeader("Content-Type", "application/pdf")
				.setHeader("Content-Disposition", `inline; filename="${fileName}"`)
				.send(pdfString);
		}

		const pdfContent = Buffer.from(pdfString, "base64").toString();

		response.writeHead(200, {
			"Content-Type": "application/pdf",
			"Content-Length": pdfContent.length,
			"Content-Disposition": `inline; filename="${fileName}"`,
		});

		response.end(pdfContent);
	}
};
