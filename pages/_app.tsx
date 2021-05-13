import type { AppProps } from "next/app";
import Head from "next/head";
import React from "react";
import { ToastContainer } from "react-toastify";
import GlobalStyle from "../shared/GlobalStyle";
import { AuthProvider } from "../shared/hooks/useAuth";

import "react-toastify/dist/ReactToastify.css";
import "bulma/css/bulma.css";

function App({ Component, pageProps }: AppProps) {
	return (
		<AuthProvider>
			<Head>
				<title>NDIS Invoice Generator</title>
			</Head>
			<GlobalStyle />
			<Component {...pageProps} />
			<ToastContainer />
		</AuthProvider>
	);
}

export default App;
