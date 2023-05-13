import { z } from "zod";

export const activitySchema = z.object({
	id: z.string().optional(),
	supportItemId: z.string(),
	clientId: z.string().min(1, "Client is required"),
	date: z
		.string()
		.regex(
			/^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/,
			"Date is required"
		),
	startTime: z.string().min(1, "Start time is required"),
	endTime: z.string().min(1, "End time is required"),
	itemDistance: z.number().nullish(),
	transitDistance: z.number().nullish(),
	transitDuration: z.number().nullish(),
});
export type ActivitySchema = z.infer<typeof activitySchema>;
