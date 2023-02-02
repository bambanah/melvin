import { publicProcedure, router } from "@server/trpc";
import { z } from "zod";
import { activityRouter } from "./activity-router";
import { clientRouter } from "./client-router";
import { invoiceRouter } from "./invoice-router";
import { pdfRouter } from "./pdf-router";
import { supportItemRouter } from "./support-item-router";

export const appRouter = router({
	hello: publicProcedure
		.input(
			z.object({
				text: z.string(),
			})
		)
		.query(({ input }) => {
			return {
				greeting: `hello ${input.text}`,
			};
		}),
	invoice: invoiceRouter,
	activity: activityRouter,
	supportItem: supportItemRouter,
	clients: clientRouter,
	pdf: pdfRouter,
});

export type AppRouter = typeof appRouter;
