import { SessionProvider } from "next-auth/react";
import Head from "next/head";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeProvider } from "styled-components";
import type { AppProps } from "next/app";
import GlobalStyle from "@styles/GlobalStyle";
import { importIcons } from "@utils/helpers";

// TODO: Use webfontimport
import "@styles/font-imports.scss";

// TODO: Extract this to its own file
const themes = {
	dark: {
		colors: {
			bg: "#202C39",
			fg: "#FEFBFD",
			link: "#4dccbd",
			brand: "#ff8484",
			error: "#ff6961",
		},
	},
	light: {
		colors: {
			bg: "#fefbfd",
			fg: "#283845",
			link: "#2374ab",
			brand: "#ff8484",
			error: "#ff6961",
		},
	},
};

// Import Fontawesome Icons
importIcons();

function App({ Component, pageProps }: AppProps) {
	return (
		<SessionProvider session={pageProps.session}>
			<ThemeProvider theme={themes.dark}>
				<Head>
					<title>Melvin</title>
					<link rel="shortcut icon" type="image/png" href="/melvin.png" />
				</Head>
				<GlobalStyle />

				<Component {...pageProps} />

				<ToastContainer />
			</ThemeProvider>
		</SessionProvider>
	);
}

export default App;
