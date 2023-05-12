import { z } from "zod";

export const activitySchema = z.object({
	id: z.string().optional(),
	supportItemId: z.string(),
	clientId: z.string(),
	date: z.string().regex(/^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/),
	startTime: z.date(),
	endTime: z.date(),
	itemDistance: z.number().nullish(),
	transitDistance: z.number().nullish(),
	transitDuration: z.number().nullish(),
});
export type ActivitySchema = z.infer<typeof activitySchema>;
