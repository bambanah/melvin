import { router } from "@/server/api/trpc";
import { activityRouter } from "./routers/activity-router";
import { clientRouter } from "./routers/client-router";
import { invoiceRouter } from "./routers/invoice-router";
import { pdfRouter } from "./routers/pdf-router";
import { supportItemRouter } from "./routers/support-item-router";
import { tripRouter } from "./routers/trip-router";
import { userRouter } from "./routers/user-router";

export const appRouter = router({
	user: userRouter,
	invoice: invoiceRouter,
	activity: activityRouter,
	supportItem: supportItemRouter,
	clients: clientRouter,
	pdf: pdfRouter,
	trip: tripRouter
});

export type AppRouter = typeof appRouter;
