import { createRouter } from "@server/create-router";
import { invoiceRouter } from "./invoice";
import superjson from "superjson";

export const appRouter = createRouter()
	.transformer(superjson)
	.merge("invoice.", invoiceRouter);

export type AppRouter = typeof appRouter;
