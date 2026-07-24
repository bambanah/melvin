// @ts-check
const { z } = require("zod");

const serverSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	NEXTAUTH_SECRET: z.string().min(1),
	NEXTAUTH_URL: z.string().url().optional(),
	GOOGLE_ID: z.string().optional(),
	GOOGLE_SECRET: z.string().optional(),
	EMAIL_SERVER: z.string().optional(),
	EMAIL_FROM: z.string().optional(),
	SEED_EMAIL: z.string().email().optional()
});

module.exports = { serverSchema };
