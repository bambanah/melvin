import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const session = await getSession({ req });
	if (!session) return res.status(401).send("Not authorized.");

	// Handle GET request
	if (req.method === "GET") {
		const { id } = req.query;

		return res.status(501).send("Not implemented");

		const pdf = String(id);

		if (!pdf) return res.status(404).send("Can't find invoice with that ID");

		return res.status(200).json(pdf);
	}

	// Unaccepted request method
	return res.status(405).send("Must be either GET or POST");
};
