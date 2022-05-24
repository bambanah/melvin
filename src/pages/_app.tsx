import React from "react";
import GlobalStyle from "@styles/global-style";
import Head from "next/head";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { AppContextProvider } from "@context/app-context";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

function App({ Component, pageProps }: AppProps) {
	return (
		<SessionProvider session={pageProps.session}>
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
	);
}

export default App;
