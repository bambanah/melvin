import { z } from "zod";

export const activitySchema = z.object({
	id: z.string().optional(),
	supportItemId: z.string(),
	clientId: z.string(),
	date: z
		.string()
		.regex(/^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/, "WRONG"),
	startTime: z.string(),
	endTime: z.string(),
	itemDistance: z.number().nullish(),
	transitDistance: z.number().nullish(),
	transitDuration: z.number().nullish(),
});
export type ActivitySchema = z.infer<typeof activitySchema>;
