import { z } from "zod";

export const invoiceSchema = z.object({
	date: z.date().optional(),
	clientId: z.string().min(1, "Client is required"),
	billTo: z.string().optional(),
	invoiceNo: z.string().min(1, "Invoice number is required"),
	activityIds: z.array(z.string()).optional(),
	activitiesToCreate: z.array(
		z.object({
			supportItemId: z.string().min(1),
			groupClientId: z.string(),
			activities: z.array(
				z
					.object({
						date: z.date(),
						startTime: z.string(),
						endTime: z.string(),
						itemDistance: z.number(),
						transitDistance: z.number().optional(),
						transitDuration: z.number().optional(),
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
