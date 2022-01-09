import Layout from "@layouts/common/Layout";
import React from "react";
import ClientPage from "@organisms/ClientList";
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
