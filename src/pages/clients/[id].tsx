import Layout from "@layouts/common/Layout";
import { Client as ClientType } from "@prisma/client";
import { GetServerSideProps } from "next";
import React from "react";
import safeJsonStringify from "safe-json-stringify";

interface ClientProps {
	client: ClientType | null;
}

const Client: React.FC<ClientProps> = ({ client }) => {
	return (
		<Layout>
			<div>This is a client</div>
			{client && client.firstName}
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
		props: { client: JSON.parse(safeJsonStringify(client ?? {})) },
	};
};

export default Client;
