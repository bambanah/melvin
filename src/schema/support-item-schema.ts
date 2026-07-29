import { RateType } from "@/generated/browser";
import {
	numberFromInput,
	optionalRate,
	TOO_MANY_DECIMALS_MESSAGE
} from "@/schema/fields";
import { z } from "zod";

export const itemCodeRegex = /^\d{2}_(?:\d{3}|\d{9})_\d{4}_\d_\d(?:_T)?$/;
const zodItemCode = z
	.string()
	.regex(itemCodeRegex, "Must be in format XX_XXX_XXXX_X_X");

export const supportItemSchema = z.object({
	id: z.string().optional(),

	description: z.string().min(1, "Required"),
	rateType: z.enum(RateType).default("HOUR"),
	isGroup: z.boolean().optional(),

	weekdayCode: zodItemCode.min(1, "Required"),
	// The weekday pair is the only mandatory one - see CONTEXT.md, Day Rate.
	weekdayRate: numberFromInput()
		.min(0.01, "Required")
		.multipleOf(0.01, TOO_MANY_DECIMALS_MESSAGE),

	weeknightCode: zodItemCode.optional().or(z.literal("")),
	weeknightRate: optionalRate,
	saturdayCode: zodItemCode.optional().or(z.literal("")),
	saturdayRate: optionalRate,
	sundayCode: zodItemCode.optional().or(z.literal("")),
	sundayRate: optionalRate
});
export type SupportItemSchema = z.infer<typeof supportItemSchema>;
/**
 * The form's field values: rates arrive as strings from their number inputs and
 * `rateType` is filled in by its default, so the input shape differs from the
 * parsed output.
 */
export type SupportItemFormValues = z.input<typeof supportItemSchema>;
