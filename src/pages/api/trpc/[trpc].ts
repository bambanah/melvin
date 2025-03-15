import { createContext } from "@/server/api/context";
import { appRouter } from "@/server/api/app-router";
import * as trpcNext from "@trpc/server/adapters/next";

export default trpcNext.createNextApiHandler({
	router: appRouter,
	createContext,
	onError:
		process.env.NODE_ENV === "development"
			? ({ path, error }) => {
					console.error(
						`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
					);
				}
			: undefined
});
