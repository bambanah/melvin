import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createContext } from "./context";

const t = initTRPC
	.context<typeof createContext>()
	.create({ transformer: superjson });

export const authMiddleware = t.middleware(({ next, ctx }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
		});
	}

	return next({
		ctx: {
			session: ctx.session,
		},
	});
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
export const authedProcedure = t.procedure.use(authMiddleware);
