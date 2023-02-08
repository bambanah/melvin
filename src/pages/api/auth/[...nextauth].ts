import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@utils/prisma";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { env } from "src/env/server";

export default NextAuth({
	adapter: PrismaAdapter(prisma),
	callbacks: {
		session: async ({ session, user }) => {
			session.user.id = user.id;

			return session;
		},
	},
	providers: [
		EmailProvider({
			server: env.EMAIL_SERVER,
			from: env.EMAIL_FROM,
		}),
		GoogleProvider({
			clientId: env.GOOGLE_ID,
			clientSecret: env.GOOGLE_SECRET,
		}),
	],
	pages: {
		signIn: "/login",
	},
	secret: "Yrrn1bc1eCZ864WRDTMsOZuDyoZOJmNEyXQD8z7jm2U=",
});
