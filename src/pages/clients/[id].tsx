import ClientPage from "@layouts/clients/ClientPage";
import Layout from "@layouts/common/Layout";
import { Client } from "@prisma/client";
import { GetServerSideProps } from "next";
import Head from "next/head";
import React from "react";
import safeJsonStringify from "safe-json-stringify";

interface ClientProps {
	client: Client;
}

const ClientView: React.FC<ClientProps> = ({ client }) => {
	return (
		<Layout>
			<Head>
				<title>{client.name} - Melvin</title>
			</Head>
			<ClientPage client={client} />
		</Layout>
	);
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
	const client = await prisma.client.findUnique({
		where: {
			id: String(params?.id) || undefined,
		},
	});

	return {
		props: { client: JSON.parse(safeJsonStringify(client ?? {})) as Client },
	};
};

export default ClientView;
