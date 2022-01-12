import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const session = await getSession({ req });
	if (!session) return res.status(401).send("Not authorized.");

	// Handle GET request
	if (req.method === "GET") {
		return res.status(501).send("Not implemented");
	}

	// Unaccepted request method
	return res.status(405).send("Must be either GET or POST");
};
