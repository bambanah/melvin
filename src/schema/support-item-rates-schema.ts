import { z } from "zod";

export const supportItemRatesSchema = z.object({
	supportItemId: z.string().min(1, "Required"),
	weekdayRate: z.coerce.number().step(0.01).optional(),
	weeknightRate: z.coerce.number().step(0.01).optional(),
	saturdayRate: z.coerce.number().step(0.01).optional(),
	sundayRate: z.coerce.number().step(0.01).optional(),
});

export type SupportItemRatesSchema = z.infer<typeof supportItemRatesSchema>;
