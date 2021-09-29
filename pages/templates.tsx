import { useSession } from "next-auth/react";
import Head from "next/head";
import React from "react";
import Layout from "../shared/components/Layout";
import Title from "../shared/components/text/Title";

const Templates = () => {
	const { status } = useSession({
		required: true,
	});

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<Head>
				<title>Templates</title>
			</Head>
			<Title>Templates</Title>
			<div>Templates will go here</div>
		</Layout>
	);
};

export default Templates;
