import { ownedDb } from "@/server/api/owned";
import type { createContext } from "@/server/api/context";

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC
	.context<typeof createContext>()
	.create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const authMiddleware = t.middleware(({ next, ctx }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({
		ctx: {
			session: { ...ctx.session, user: ctx.session.user },
			owned: ownedDb(ctx.prisma, ctx.session.user.id)
		}
	});
});

export const authedProcedure = t.procedure.use(authMiddleware);
