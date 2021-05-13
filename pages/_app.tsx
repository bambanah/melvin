import React from "react";
import { ToastContainer } from "react-toastify";
import type { AppProps } from "next/app";
import GlobalStyle from "../shared/GlobalStyle";
import { AuthProvider } from "../shared/hooks/use-auth";

function App({ Component, pageProps }: AppProps) {
	return (
		<AuthProvider>
			<GlobalStyle />
			<Component {...pageProps} />
			<ToastContainer />
		</AuthProvider>
	);
}

export default App;
