import { z } from "zod";

export const activityTransportTypeEnum = z.enum([
	"DISTANCE",
	"PARKING",
	"TOLL",
	"OTHER"
]);
export type ActivityTransportType = z.infer<typeof activityTransportTypeEnum>;

export const activityTransportItemSchema = z.object({
	id: z.string().optional(),
	type: activityTransportTypeEnum,
	amount: z.number().min(0),
	note: z.string().optional()
});
export type ActivityTransportItemSchema = z.infer<
	typeof activityTransportItemSchema
>;

export const activitySchema = z
	.object({
		id: z.string().optional(),
		supportItemId: z.string(),
		clientId: z.string().min(1, "Client is required"),
		date: z.date({ required_error: "Date is required" }),
		startTime: z.string().min(1, "Start time is required"),
		endTime: z.string().min(1, "End time is required"),
		itemDistance: z.number(),
		transitDistance: z.string().optional(),
		transitDuration: z.string().optional(),
		transportItems: z.array(activityTransportItemSchema).optional()
	})
	.partial({ startTime: true, endTime: true, itemDistance: true })
	.refine(
		(data) => (!!data.startTime && !!data.endTime) || !!data.itemDistance
	);
export type ActivitySchema = z.infer<typeof activitySchema>;
