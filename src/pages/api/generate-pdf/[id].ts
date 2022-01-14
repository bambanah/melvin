import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async (request: NextApiRequest, response: NextApiResponse) => {
	const session = await getSession({ req: request });
	if (!session) return response.status(401).send("Not authorized.");

	// Handle GET request
	if (request.method === "GET") {
		return response.status(501).send("Not implemented");
	}

	// Unaccepted request method
	return response.status(405).send("Must be either GET or POST");
};
