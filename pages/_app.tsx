import Head from "next/head";
import React from "react";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "styled-components";
import type { AppProps } from "next/app";
import GlobalStyle from "../shared/GlobalStyle";
import { AuthProvider } from "../shared/hooks/useAuth";

import "react-toastify/dist/ReactToastify.css";
import "bulma/css/bulma.css";
import "../styles/font-imports.scss";

const theme = {
	colors: {
		fg: "#363636",
		bg: "#f5f5f5",
		link: "#3273dc",
		brand: "#6B2875",
		error: "#ff6961",
		accent:
			"linear-gradient(24deg, rgba(126,249,145,1) 0%, rgba(120,199,254,1) 100%)",
	},
};

function App({ Component, pageProps }: AppProps) {
	return (
		<AuthProvider>
			<ThemeProvider theme={theme}>
				<Head>
					<title>NDIS Invoice Generator</title>
				</Head>
				<GlobalStyle />
				<Component {...pageProps} />
				<ToastContainer />
			</ThemeProvider>
		</AuthProvider>
	);
}

export default App;
