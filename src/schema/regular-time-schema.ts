import { timeOfDaySchema } from "@/schema/log-schema";
import { z } from "zod";

export const regularTimeSchema = z
	.object({
		startTime: timeOfDaySchema,
		endTime: timeOfDaySchema,
		supportItemId: z.string().min(1, "Support Item is required"),
		claimsTravel: z.boolean()
	})
	.refine((data) => data.startTime < data.endTime, {
		message: "End time must be after start time",
		path: ["endTime"]
	});
export type RegularTimeSchema = z.infer<typeof regularTimeSchema>;
