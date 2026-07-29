import { optionalRate } from "@/schema/fields";
import { z } from "zod";

/** A Client's Custom Rate overrides of a Support Item's Day Rates. */
export const supportItemRatesSchema = z.object({
	supportItemId: z.string().min(1, "Required"),
	weekdayRate: optionalRate,
	weeknightRate: optionalRate,
	saturdayRate: optionalRate,
	sundayRate: optionalRate
});

export type SupportItemRatesSchema = z.infer<typeof supportItemRatesSchema>;
/** The dialog's field values: rates arrive as strings from their inputs. */
export type SupportItemRatesFormValues = z.input<typeof supportItemRatesSchema>;
