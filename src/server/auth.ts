import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingMessage } from "node:http";
import { sendMail } from "./email";
import prisma from "./prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_ID || "",
			clientSecret: process.env.GOOGLE_SECRET || "",
			// Single-operator app: Google sign-in only links to or signs in an
			// existing User; first-time Google emails are rejected, not created.
			disableSignUp: true
		}
	},
	emailAndPassword: {
		enabled: true,
		// Single-operator app: no self-service registration. Blocks direct
		// POSTs to /api/auth/sign-up/email (there is no sign-up UI).
		disableSignUp: true,
		// A password signup that claims an existing email would otherwise take
		// over that account through the trusted-provider link below. Do not relax.
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			await sendMail({
				to: user.email,
				subject: "Reset your Melvin password",
				text: `Set a new password for Melvin: ${url}`
			});
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendMail({
				to: user.email,
				subject: "Verify your Melvin email address",
				text: `Verify your email address for Melvin: ${url}`
			});
		}
	},
	account: {
		// Google's email is verified at the source, so an existing account is
		// re-linked on first sign-in rather than rejected as OAuthAccountNotLinked.
		accountLinking: { trustedProviders: ["google"] }
	},
	// Auth rows carry `@default(cuid())` like the rest of the schema.
	advanced: { database: { generateId: false } }
});

/**
 * Reads the session for a Node request. The `fromNodeHeaders` bridge is
 * throwaway Next glue - #419 deletes it - so it lives behind this one call.
 */
export const getServerAuthSession = (req: IncomingMessage) =>
	auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
