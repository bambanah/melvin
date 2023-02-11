// @ts-check
const { z } = require("zod");

const serverSchema = z.object({
	DATABASE_URL: z.string().url(),
	NODE_ENV: z.enum(["development", "test", "production"]),
	NEXTAUTH_SECRET:
		process.env.NODE_ENV === "production"
			? z.string().min(1)
			: z.string().min(1).optional(),
	NEXTAUTH_URL: z.preprocess(
		(str) => process.env.VERCEL_URL ?? str,
		process.env.VERCEL ? z.string() : z.string().url()
	),
	GOOGLE_ID: z.string(),
	GOOGLE_SECRET: z.string(),
	EMAIL_SERVER: z.string(),
	EMAIL_FROM: z.string(),
	SEED_EMAIL: z.string().email().optional(),
});

module.exports = { serverSchema };
