import { RateType } from "@prisma/client";
import { z } from "zod";

export const itemCodeRegex = /^\d{2}_(?:\d{3}|\d{9})_\d{4}_\d_\d(?:_T)?$/;
const zodItemCode = z
	.string()
	.regex(itemCodeRegex, "Must be in format XX_XXX_XXXX_X_X");

export const supportItemSchema = z.object({
	id: z.string().optional(),

	description: z.string().min(1, "Required"),
	rateType: z.nativeEnum(RateType).default("HOUR"),
	isGroup: z.boolean().optional(),

	weekdayCode: zodItemCode.min(1, "Required"),
	weekdayRate: z.coerce
		.number({ invalid_type_error: "Must be number" })
		.min(0.01, "Required")
		.step(0.01, "Can't be more than 2 decimal places (x.xx)"),

	weeknightCode: zodItemCode.optional().or(z.literal("")),
	weeknightRate: z.coerce
		.number({ invalid_type_error: "Must be a number" })
		.step(0.01, "Can't be more than 2 decimal places (x.xx)")
		.optional(),
	saturdayCode: zodItemCode.optional().or(z.literal("")),
	saturdayRate: z.coerce
		.number({ invalid_type_error: "Must be a number" })
		.step(0.01, "Can't be more than 2 decimal places (x.xx)")
		.optional(),
	sundayCode: zodItemCode.optional().or(z.literal("")),
	sundayRate: z.coerce
		.number({ invalid_type_error: "Must be a number" })
		.step(0.01, "Can't be more than 2 decimal places (x.xx)")
		.optional(),
});
export type SupportItemSchema = z.infer<typeof supportItemSchema>;
