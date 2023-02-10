import { z } from "zod";

export const activitySchema = z.object({
	id: z.string().optional(),
	supportItemId: z.string(),
	clientId: z.string(),
	date: z.date(),
	startTime: z.date(),
	endTime: z.date(),
	itemDistance: z.number().nullish(),
	transitDistance: z.number().nullish(),
	transitDuration: z.number().nullish(),
});
export type ActivitySchema = z.infer<typeof activitySchema>;
