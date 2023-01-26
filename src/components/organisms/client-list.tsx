import {
	faEdit,
	faIdCard,
	faTrash,
	faWallet,
} from "@fortawesome/free-solid-svg-icons";
import EntityList from "@molecules/entity-list";
import { EntityListItem } from "@molecules/entity-list/entity-list";
import { Client } from "@prisma/client";
import { useRouter } from "next/router";
import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Invoice from "types/invoice";
import useSWR, { mutate } from "swr";
import axios from "axios";
import { toast } from "react-toastify";

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
			router.push(`/invoices/create?for=${id}`);
		} else {
			const invoice = (await response.json()) as Invoice;

			router.push(`/invoices/create?copyFrom=${invoice.id}`);
		}
	};

	const generateEntity = (client?: Client): EntityListItem => ({
		id: client ? client?.id || "" : "loading",
		fields: [
			{
				value: client ? client?.name || "N/A" : <Skeleton />,
				type: "label",
				flex: "1 1 100%",
			},
			{
				value: client ? client?.number || "N/A" : <Skeleton />,
				icon: faIdCard,
				type: "text",
				flex: "1 0 7.2em",
			},
			{
				value: client ? client?.billTo || "N/A" : <Skeleton />,
				icon: faWallet,
				type: "text",
				flex: "0 0 9.7em",
			},
		],
		actions: client
			? [
					{
						value: "New Invoice",
						type: "button",
						onClick: () => copyLatestInvoice(client.id),
					},
					{
						value: "Edit",
						type: "link",
						icon: faEdit,
						href: `/clients/${client.id}?edit=true`,
					},
					{
						value: "Delete",
						type: "button",
						icon: faTrash,
						onClick: () => {
							if (confirm(`Are you sure you want to delete ${client.name}?`)) {
								axios
									.delete(`/api/clients/${client.id}`)
									.then(() => {
										mutate("/api/clients");
										toast.success("Client deleted");
									})
									.catch((error) => toast.error(error));
							}
						},
					},
			  ]
			: [],
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
