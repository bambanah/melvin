// @ts-check
const { z } = require("zod");

const serverSchema = z.object({
	DATABASE_URL: z.string().url(),
	NODE_ENV: z.enum(["development", "test", "production"]),
	NEXTAUTH_SECRET: z.string().min(1).optional(),
	NEXTAUTH_URL: z.preprocess(
		(str) => process.env.VERCEL_URL ?? str,
		process.env.VERCEL ? z.string() : z.string().url()
	),
	GOOGLE_ID: z.string().optional(),
	GOOGLE_SECRET: z.string().optional(),
	EMAIL_SERVER: z.string().optional(),
	EMAIL_FROM: z.string().optional(),
	SEED_EMAIL: z.string().email().optional(),
});

module.exports = { serverSchema };
