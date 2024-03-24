import { z } from "zod";

export const activitySchema = z
	.object({
		id: z.string().optional(),
		supportItemId: z.string(),
		clientId: z.string().min(1, "Client is required"),
		date: z.date({ required_error: "Date is required" }),
		startTime: z.string(),
		endTime: z.string(),
		itemDistance: z.number(),
		transitDistance: z.string().optional(),
		transitDuration: z.string().optional(),
	})
	.partial({ startTime: true, endTime: true, itemDistance: true })
	.refine(
		(data) => (!!data.startTime && !!data.endTime) || !!data.itemDistance
	);
export type ActivitySchema = z.infer<typeof activitySchema>;
