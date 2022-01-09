import Card from "@molecules/Card";
import { Client } from "@prisma/client";
import Link from "next/link";
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
			<Styles.ClientList>
				<Link href="/clients/create">
					<Card className="create">
						<span>+</span>
					</Card>
				</Link>
				{clients.map((client) => (
					<Link href={`/clients/${client.id}`}>
						<Card>
							<h1>{client.name}</h1>
							<div>
								<p>{client.number}</p>
								<p>{client.billTo ?? "N/A"}</p>
								<p>{client.invoicePrefix?.concat("-XXX") ?? "N/A"}</p>
							</div>
						</Card>
					</Link>
				))}
			</Styles.ClientList>
		</Styles.Container>
	);
};

export default ClientList;
