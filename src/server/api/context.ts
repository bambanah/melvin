import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

import prisma from "@/server/prisma";
import { getServerAuthSession } from "@/server/auth";

export const createContext = async ({ req, res }: CreateNextContextOptions) => {
	const session = await getServerAuthSession({ req, res });

	return {
		prisma,
		session,
	};
};
