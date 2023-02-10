import { AppContextProvider } from "@context/app-context";
import GlobalStyle from "@styles/global-style";
import { trpc } from "@utils/trpc";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";

import "react-loading-skeleton/dist/skeleton.css";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
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

export default trpc.withTRPC(App);
