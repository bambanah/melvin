import Layout from "@components/shared/layout";
import React from "react";
import ClientPage from "@components/clients/client-list";
import Head from "next/head";

const Clients = () => {
	return (
		<Layout>
			<Head>
				<title>Clients - Melvin</title>
			</Head>
			<ClientPage />
		</Layout>
	);
};

export default Clients;
