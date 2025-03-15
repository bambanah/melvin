import { z } from "zod";

export const userSchema = z.object({
	name: z.string().optional(),
	defaultSupportItemId: z.string().optional(),
	defaultGroupSupportItemId: z.string().optional(),
	abn: z.coerce
		.number()
		.min(10_000_000_000, "Must be 11 digits")
		.max(99_999_999_999, "Must be 11 digits")
		.optional(),
	bankName: z.string().optional(),
	bankNumber: z.coerce.number().optional(),
	bsb: z.coerce
		.number()
		.min(100_000, "Must be 6 digits")
		.max(999_999, "Must be 6 digits")
		.optional()
});
export type UserSchema = z.infer<typeof userSchema>;
