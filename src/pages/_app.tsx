import "@/styles/globals.css";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { Inter, Patua_One, Roboto_Mono } from "next/font/google";
import Head from "next/head";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ThemeProvider } from "@/components/theme-provider";

// Google fonts
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});
const patuaOne = Patua_One({
	subsets: ["latin"],
	variable: "--font-patua-one",
	weight: "400",
});
const robotoMono = Roboto_Mono({
	subsets: ["latin"],
	variable: "--font-roboto-mono",
});

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
	return (
		<main
			className={cn(
				"min-h-screen bg-background font-sans antialiased",
				inter.variable,
				patuaOne.variable,
				robotoMono.variable
			)}
		>
			<style jsx global>{`
				:root {
					--font-inter: ${inter.style.fontFamily};
					--font-patua-one: ${patuaOne.style.fontFamily};
					--font-roboto-mono: ${robotoMono.style.fontFamily};
				}
			`}</style>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				<SessionProvider session={session}>
					<Head>
						<title>Melvin</title>
						<link rel="shortcut icon" type="image/png" href="/melvin.png" />
					</Head>
					<Component {...pageProps} />

					<ToastContainer position="bottom-right" stacked={true} />
				</SessionProvider>

				<SpeedInsights />
			</ThemeProvider>
		</main>
	);
}

export default trpc.withTRPC(App);
