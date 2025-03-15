import generatePDF from "@/lib/pdf-generation";
import { NextApiRequest, NextApiResponse } from "next";

const request = async (request: NextApiRequest, response: NextApiResponse) => {
	if (request.method === "GET") {
		const { id, base64 } = request.query;

		const { pdfString, fileName } = await generatePDF(String(id));

		if (!pdfString) {
			response.status(404).send("Can't find PDF");
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
			"Content-Disposition": `inline; filename="${fileName}"`
		});

		response.end(pdfContent);
	}
};

export default request;
