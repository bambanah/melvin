import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { GetServerSidePropsContext } from "next";
import {
	getServerSession,
	type DefaultSession,
	type NextAuthOptions,
} from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import prisma from "./prisma";

declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
			email: string;
		} & DefaultSession["user"];
	}
}

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma),
	callbacks: {
		session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
			}

			return session;
		},
	},
	providers: [
		EmailProvider({
			server: process.env.EMAIL_SERVER,
			from: process.env.EMAIL_FROM,
		}),
		GoogleProvider({
			clientId: process.env.GOOGLE_ID || "",
			clientSecret: process.env.GOOGLE_SECRET || "",
		}),
	],
	pages: {
		signIn: "/login",
	},
	secret: "Yrrn1bc1eCZ864WRDTMsOZuDyoZOJmNEyXQD8z7jm2U=",
};

export const getServerAuthSession = ({
	req,
	res,
}: {
	req: GetServerSidePropsContext["req"];
	res: GetServerSidePropsContext["res"];
}) => {
	return getServerSession(req, res, authOptions);
};
