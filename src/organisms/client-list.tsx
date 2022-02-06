import EntityList from "@molecules/entity-list";
import { EntityListItem } from "@molecules/entity-list/entity-list";
import { Client } from "@prisma/client";
import React from "react";
import useSWR from "swr";

const getClients = async () => {
	const response = await fetch("/api/clients");

	return (await response.json()) as Client[];
};

const ClientList = () => {
	const { data: clients, error } = useSWR("/api/clients", getClients);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!clients) return <div>loading...</div>;

	const entities: EntityListItem[] = clients.map((client) => ({
		id: client.id,
		fields: [
			{ value: client.name, type: "label", flex: "1 1 100%" },
			{
				value: client.number || "N/A",
				icon: "id-card",
				type: "text",
				flex: "1 0 7em",
			},
			{
				value: client.billTo || "N/A",
				icon: "wallet",
				type: "text",
				flex: "0 0 9em",
			},
		],
	}));

	return (
		<EntityList
			title="Clients"
			route="/clients"
			maxWidth="40em"
			entities={entities}
		/>
	);
};

export default ClientList;
