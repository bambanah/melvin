import generatePDF from "@utils/pdf-generation";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "GET") {
		const { invoiceId } = req.query;

		const pdf = await generatePDF(String(invoiceId));

		return res.status(200).send(pdf);
	}
};
