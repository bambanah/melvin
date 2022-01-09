import Card from "@molecules/Card";
import CardContainer from "@molecules/CardContainer";
import { Client } from "@prisma/client";
import React from "react";
import useSWR from "swr";
import * as Styles from "./styles";

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

	return (
		<Styles.Container>
			<CardContainer>
				<Card href="/clients/create" create>
					<span>+</span>
				</Card>
				{clients.map((client) => (
					<Card href={`/clients/${client.id}`}>
						<h1>{client.name}</h1>
						<div>
							<p>{client.number}</p>
							<p>{client.billTo ?? "N/A"}</p>
							<p>{client.invoicePrefix?.concat("-XXX") ?? "N/A"}</p>
						</div>
					</Card>
				))}
			</CardContainer>
		</Styles.Container>
	);
};

export default ClientList;
