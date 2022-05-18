import { faIdCard, faWallet } from "@fortawesome/free-solid-svg-icons";
import EntityList from "@molecules/entity-list";
import { EntityListItem } from "@molecules/entity-list/entity-list";
import { Client } from "@prisma/client";
import { useRouter } from "next/router";
import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Invoice from "types/invoice";
import useSWR from "swr";

const getClients = async () => {
	const response = await fetch("/api/clients");

	return (await response.json()) as Client[];
};

const ClientList = () => {
	const { data: clients, error } = useSWR("/api/clients", getClients);
	const router = useRouter();

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	const copyLatestInvoice = async (id: string) => {
		const response = await fetch(`/api/clients/${id}/latest-invoice`);

		if (response.status === 404) {
			router.push(`/dashboard/invoices/create?for=${id}`);
		} else {
			const invoice = (await response.json()) as Invoice;

			router.push(`/dashboard/invoices/create?copyFrom=${invoice.id}`);
		}
	};

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
				icon: faIdCard,
				type: "text",
				flex: "1 0 7.2em",
			},
			{
				value: !client ? <Skeleton /> : client?.billTo || "N/A",
				icon: faWallet,
				type: "text",
				flex: "0 0 9.7em",
			},
		],
		actions: !client
			? []
			: [
					{
						value: "New Invoice",
						type: "button",
						onClick: () => copyLatestInvoice(client.id),
					},
			  ],
	});

	if (!clients)
		return (
			<EntityList
				title="Clients"
				route="/dashboard/clients"
				entities={
					Array.from({ length: 3 }).fill(generateEntity()) as EntityListItem[]
				}
			/>
		);

	return (
		<EntityList
			title="Clients"
			route="/dashboard/clients"
			entities={clients.map((client) => generateEntity(client))}
		/>
	);
};

export default ClientList;
