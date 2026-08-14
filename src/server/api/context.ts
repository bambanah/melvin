import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

import { getServerAuthSession } from "@/server/auth";
import prisma from "@/server/prisma";

export const createContext = async ({ req }: CreateNextContextOptions) => {
	const session = await getServerAuthSession(req);

	return {
		prisma,
		session: session && {
			user: { id: session.user.id, email: session.user.email }
		}
	};
};
