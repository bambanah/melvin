import EntityList from "@molecules/entity-list";
import { EntityListItem } from "@molecules/entity-list/entity-list";
import { Client } from "@prisma/client";
import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
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

	const generateEntity = (client?: Client): EntityListItem => ({
		id: !client ? "loading" : client?.id || "",
		fields: [
			{
				value: !client ? <Skeleton /> : client?.name || "N/A",
				type: "label",
				flex: "1 1 100%",
			},
			{
				value: !client ? <Skeleton /> : client?.number || "N/A",
				icon: "id-card",
				type: "text",
				flex: "1 0 7em",
			},
			{
				value: !client ? <Skeleton /> : client?.billTo || "N/A",
				icon: "wallet",
				type: "text",
				flex: "0 0 9.5em",
			},
		],
	});

	if (!clients)
		return (
			<EntityList
				title="Clients"
				route="/clients"
				entities={
					Array.from({ length: 3 }).fill(generateEntity()) as EntityListItem[]
				}
			/>
		);

	return (
		<EntityList
			title="Clients"
			route="/clients"
			entities={clients.map((client) => generateEntity(client))}
		/>
	);
};

export default ClientList;
