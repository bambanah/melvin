import Button from "@atoms/Button";
import { Client } from "@prisma/client";
import React, { useState } from "react";
import * as Styles from "./styles";

interface ClientProps {
	client: Client;
}

const ClientPage: React.FC<ClientProps> = ({ client }) => {
	const [editing, setEditing] = useState(false);

	return (
		<Styles.ClientPage>
			<h1>{client.name}</h1>

			<Button onClick={() => setEditing(true)}>Edit</Button>

			{editing ? (
				<p>Editing</p>
			) : (
				<>
					<p>Client Number: {client.number}</p>
					<p>Bill To: {client.billTo ?? "Not Set"}</p>
					<p>Invoice Prefix: {client.invoicePrefix ?? "Not Set"}</p>
				</>
			)}
		</Styles.ClientPage>
	);
};

export default ClientPage;
