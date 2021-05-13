import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "../shared/hooks/use-auth";
import Layout from "../components/Layout";
import { GetStaticPropsContext } from "next";

import "bulma/css/bulma.css";
import "react-toastify/dist/ReactToastify.css";
import Home from "../components/Home";

export default function index() {
	const router = useRouter();

	const { authenticated, loadingAuthState } = useAuth();

	if (loadingAuthState) {
		return <div>Loading...</div>;
	}

	if (!authenticated && !loadingAuthState) {
		router.push("/login");
		return <div>Redirecting...</div>;
	}

	return (
		<Layout>
			<Head>
				<title>Home</title>
			</Head>
			<Home />
		</Layout>
	);
}
