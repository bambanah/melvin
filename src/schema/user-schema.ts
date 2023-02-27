import { z } from "zod";

export const userSchema = z.object({
	name: z.string().nullish(),
	abn: z
		.number()
		.min(10_000_000_000, "Must be 11 digits")
		.max(99_999_999_999, "Must be 11 digits")
		.nullish(),
	bankName: z.string().nullish(),
	bankNumber: z.number().nullish(),
	bsb: z
		.number()
		.min(100_000, "Must be 6 digits")
		.max(999_999, "Must be six digits")
		.nullish(),
});
export type UserSchema = z.infer<typeof userSchema>;
