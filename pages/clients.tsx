import { Client } from ".prisma/client";
import Layout from "@Components/Layout";
import { useSession } from "next-auth/react";
import React from "react";
import useSWR from "swr";

const getInvoices = async () => {
	const response = await fetch("/api/clients");

	return (await response.json()) as Client[];
};

const Clients = () => {
	const { status } = useSession({
		required: true,
	});

	const { data: clients, error } = useSWR("/api/invoices", getInvoices);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (status === "loading" || !clients) {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<ul>
				{clients?.map((client) => (
					<li>
						{client.firstName} {client.lastName}
					</li>
				))}
			</ul>
		</Layout>
	);
};

export default Clients;
