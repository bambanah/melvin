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
});
export type InvoiceSchema = z.infer<typeof invoiceSchema>;
