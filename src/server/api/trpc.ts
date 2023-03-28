import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

import { getServerAuthSession } from "@server/auth";
import prisma from "@server/prisma";

const createContext = async ({ req, res }: CreateNextContextOptions) => {
	const session = await getServerAuthSession({ req, res });

	return {
		prisma,
		session,
	};
};

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC
	.context<typeof createContext>()
	.create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export const authMiddleware = t.middleware(({ next, ctx }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({
		ctx: {
			session: { ...ctx.session, user: ctx.session.user },
		},
	});
});

export const authedProcedure = t.procedure.use(authMiddleware);
