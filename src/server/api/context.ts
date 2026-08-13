import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { fromNodeHeaders } from "better-auth/node";

import { toAppSession } from "@/server/api/session";
import { auth } from "@/server/auth";
import prisma from "@/server/prisma";

export const createContext = async ({ req }: CreateNextContextOptions) => {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers)
	});

	return {
		prisma,
		session: toAppSession(session)
	};
};
