import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

import { toAppSession } from "@/server/api/session";
import { getServerAuthSession } from "@/server/auth";
import prisma from "@/server/prisma";

export const createContext = async ({ req }: CreateNextContextOptions) => ({
	prisma,
	session: toAppSession(await getServerAuthSession(req))
});
