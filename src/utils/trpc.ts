import { AppRouter } from "@server/api/app-router";
import { httpBatchLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import superjson from "superjson";
import { z } from "zod";

function getBaseUrl() {
	if (typeof window !== "undefined") {
		return "";
	}

	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc = createTRPCNext<AppRouter>({
	config({ ctx }) {
		if (typeof window !== "undefined") {
			// Client requests
			return {
				transformer: superjson,
				links: [
					httpBatchLink({
						url: `${getBaseUrl()}/api/trpc`,
					}),
				],
			};
		}

		return {
			transformer: superjson,
			links: [
				httpBatchLink({
					url: `${getBaseUrl()}/api/trpc`,
					headers() {
						if (ctx?.req) {
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							const { connection: _connection, ...headers } = ctx.req.headers;
							return { ...headers, "x-ssr": "1" };
						}
						return {};
					},
				}),
			],
		};
	},
	ssr: true,
});

export const baseListQueryInput = z.object({
	limit: z.number().min(1).max(100).optional(),
	cursor: z.string().optional(),
});
