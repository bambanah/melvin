import { Client } from "@prisma/client";
import Layout from "@layouts/common/Layout";
import { useSession } from "next-auth/react";
import React from "react";
import useSWR from "swr";
import ClientPage from "@layouts/clients/ClientPage";
import NavLink from "@molecules/NavLink";

const getClients = async () => {
	const response = await fetch("/api/clients");

	return (await response.json()) as Client[];
};

const Clients = () => {
	const { status } = useSession({
		required: true,
	});

	const { data: clients, error } = useSWR("/api/clients", getClients);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (status === "loading" || !clients) {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<NavLink href="/clients/create">Create</NavLink>
			<ClientPage clients={clients} />
		</Layout>
	);
};

export default Clients;
