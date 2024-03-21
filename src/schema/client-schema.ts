import { z } from "zod";

export const clientSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Required"),
	number: z.string().nullish(),
	billTo: z.string().nullish(),
	invoiceNumberPrefix: z.string().nullish(),
	defaultTransitDistance: z.string().nullish(),
	defaultTransitTime: z.string().nullish(),
});
export type ClientSchema = z.infer<typeof clientSchema>;
