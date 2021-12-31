import { Client } from "@prisma/client";
import React from "react";
import * as Styles from "./styles";

interface ClientProps {
	clients: Client[];
}

const ClientPage: React.FC<ClientProps> = ({ clients }) => {
	return (
		<Styles.ClientList>
			{clients?.map((client) => (
				<Styles.Client href={`/clients/${client.id}`}>
					<a>
						{client.firstName} {client.lastName}
					</a>
				</Styles.Client>
			))}
		</Styles.ClientList>
	);
};

export default ClientPage;
