import GlobalStyle from "@styles/global-style";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AppContextProvider } from "@context/app-context";

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
