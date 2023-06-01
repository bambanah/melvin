import { z } from "zod";

export const activitySchema = z
	.object({
		id: z.string().optional(),
		supportItemId: z.string(),
		clientId: z.string().min(1, "Client is required"),
		date: z
			.string()
			.regex(
				/^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/,
				"Date is required"
			),
		startTime: z.string(),
		endTime: z.string(),
		itemDistance: z.number(),
		transitDistance: z.number().nullish(),
		transitDuration: z.number().nullish(),
	})
	.partial({ startTime: true, endTime: true, itemDistance: true })
	.refine(
		(data) => (!!data.startTime && !!data.endTime) || !!data.itemDistance
	);
export type ActivitySchema = z.infer<typeof activitySchema>;
