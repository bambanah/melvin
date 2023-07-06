import { z } from "zod";

export const invoiceSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/)
		.optional(),
	clientId: z.string().min(1, "Client is required"),
	billTo: z.string().nullish(),
	invoiceNo: z.string().min(1, "Invoice number is required"),
	activityIds: z.array(z.string()).optional(),
	activitiesToCreate: z.array(
		z.object({
			supportItemId: z.string(),
			activities: z.array(
				z
					.object({
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
						(data) =>
							(!!data.startTime && !!data.endTime) || !!data.itemDistance
					)
			),
		})
	),
});
export type InvoiceSchema = z.infer<typeof invoiceSchema>;
