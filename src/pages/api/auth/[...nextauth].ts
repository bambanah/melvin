import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@utils/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

export default NextAuth({
	adapter: PrismaAdapter(prisma),
	callbacks: {
		session: async ({ session, user }) => {
			session.user.id = user.id;

			return Promise.resolve(session);
		},
	},
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_ID || "",
			clientSecret: process.env.GOOGLE_SECRET || "",
		}),
	],
	pages: {
		signIn: "/login",
	},
	secret: "Yrrn1bc1eCZ864WRDTMsOZuDyoZOJmNEyXQD8z7jm2U=",
});
