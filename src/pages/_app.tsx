"use client";

import React from "react";
import GlobalStyle from "@styles/global-style";
import Head from "next/head";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { AppContextProvider } from "@context/app-context";
import superjson from "superjson";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { withTRPC } from "@trpc/next";
import { AppRouter } from "@server/routers/_app";
config.autoAddCss = false;

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
	return (
		<main>
			<SessionProvider session={session}>
				<AppContextProvider>
					<Head>
						<title>Melvin</title>
						<link rel="shortcut icon" type="image/png" href="/melvin.png" />
					</Head>
					<GlobalStyle />
					<Component {...pageProps} />

					<ToastContainer />
				</AppContextProvider>
			</SessionProvider>
		</main>
	);
}

export default withTRPC<AppRouter>({
	config() {
		const url = process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}/api/trpc`
			: "http://localhost:3000/api/trpc";

		return {
			transformer: superjson,
			url,
		};
	},
	ssr: true,
})(App);
