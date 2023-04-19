import { z } from "zod";
import { activitySchema } from "./activity-schema";

export const invoiceSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/)
		.optional(),
	clientId: z.string().min(1, "Client is required"),
	billTo: z.string().nullish(),
	invoiceNo: z.string().min(1, "Invoice number is required"),
});
export type InvoiceSchema = z.infer<typeof invoiceSchema>;

export const invoiceWithActivitiesSchema = invoiceSchema.extend({
	activities: z.array(activitySchema).optional(),
});
export type InvoiceWithActivitiesSchema = z.infer<
	typeof invoiceWithActivitiesSchema
>;
