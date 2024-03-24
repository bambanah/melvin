import { z } from "zod";

export const clientSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Required"),
	number: z.string().optional(),
	billTo: z.string().optional(),
	invoiceNumberPrefix: z.string().optional(),
	defaultTransitDistance: z.string().optional(),
	defaultTransitTime: z.string().optional(),
	invoiceEmail: z.string().optional(),
});
export type ClientSchema = z.infer<typeof clientSchema>;
