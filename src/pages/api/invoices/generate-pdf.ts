import generatePDF from "@utils/pdf-generation";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "GET") {
		const { invoiceId } = req.query;

		const [pdf, fileName] = await generatePDF(String(invoiceId));

		if (!pdf) {
			return res.status(404).send("Can't find PDF");
		}

		return res
			.status(200)
			.setHeader("Content-Type", "application/pdf")
			.setHeader("Content-disposition", `inline; filename="${fileName}"`)
			.send(pdf);
	}
};
