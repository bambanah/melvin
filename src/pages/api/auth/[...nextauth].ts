import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@utils/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

export default NextAuth({
	adapter: PrismaAdapter(prisma),
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_ID || "",
			clientSecret: process.env.GOOGLE_SECRET || "",
		}),
	],
	pages: {
		signIn: "/login",
	},
});
