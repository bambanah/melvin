import Layout from "@layouts/common/Layout";
import CreateClientForm from "@organisms/forms/CreateClientForm";
import Head from "next/head";
import React from "react";

const CreateClient = () => {
	return (
		<Layout>
			<Head>
				<title>Create Invoice - Melvin</title>
			</Head>
			<CreateClientForm />
		</Layout>
	);
};

export default CreateClient;
