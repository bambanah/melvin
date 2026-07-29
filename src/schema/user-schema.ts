import { numberFromInput } from "@/schema/fields";
import { z } from "zod";

export const userSchema = z.object({
	name: z.string().optional(),
	defaultSupportItemId: z.string().optional(),
	defaultGroupSupportItemId: z.string().optional(),
	abn: numberFromInput()
		.min(10_000_000_000, "Must be 11 digits")
		.max(99_999_999_999, "Must be 11 digits")
		.optional(),
	bankName: z.string().optional(),
	bankNumber: numberFromInput().optional(),
	bsb: numberFromInput()
		.min(100_000, "Must be 6 digits")
		.max(999_999, "Must be 6 digits")
		.optional(),
	transitRatePerKm: numberFromInput()
		.min(0, "Must be positive")
		.max(0.99, "Maximum $0.99/km")
		.optional()
});
export type UserSchema = z.infer<typeof userSchema>;
/** The account form's field values: numbers arrive as strings from their inputs. */
export type UserFormValues = z.input<typeof userSchema>;
