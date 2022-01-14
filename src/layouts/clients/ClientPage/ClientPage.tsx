import Button from "@atoms/Button";
import Loading from "@atoms/Loading";
import ClientForm from "@organisms/forms/ClientForm";
import { fetcher } from "@utils/helpers";
import { useRouter } from "next/router";
import React, { useState } from "react";
import useSWR from "swr";
import * as Styles from "./styles";

const ClientPage = () => {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	console.log(`/api/clients/${router.query.id}`);
	const { data: client, error } = useSWR(
		`/api/clients/${router.query.id}`,
		fetcher
	);

	if (error) return <div>Error</div>;
	if (!client) return <Loading />;

	return (
		<Styles.ClientPage>
			{editing ? (
				<ClientForm
					initialValues={client}
					returnFunction={() => {
						setEditing(false);
					}}
				/>
			) : (
				<Styles.Content>
					<h1>{client.name}</h1>
					<Button onClick={() => setEditing(true)}>Edit</Button>
					<div>
						<p>Client Number: {client.number}</p>
						<p>Bill To: {client.billTo ?? "Not Set"}</p>
						<p>Invoice Prefix: {client.invoicePrefix ?? "Not Set"}</p>
					</div>
				</Styles.Content>
			)}
		</Styles.ClientPage>
	);
};

export default ClientPage;
