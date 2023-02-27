import { publicProcedure, router } from "@server/trpc";
import { z } from "zod";
import { userRouter } from "./routers/user-router";
import { activityRouter } from "./routers/activity-router";
import { clientRouter } from "./routers/client-router";
import { invoiceRouter } from "./routers/invoice-router";
import { pdfRouter } from "./routers/pdf-router";
import { supportItemRouter } from "./routers/support-item-router";

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
	user: userRouter,
	invoice: invoiceRouter,
	activity: activityRouter,
	supportItem: supportItemRouter,
	clients: clientRouter,
	pdf: pdfRouter,
});

export type AppRouter = typeof appRouter;
