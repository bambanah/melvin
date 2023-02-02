import Button from "@atoms/button";
import Loading from "@atoms/loading";
import ClientForm from "@components/clients/client-form";
import { trpc } from "@utils/trpc";
import { useRouter } from "next/router";
import { useState } from "react";
import * as Styles from "./styles";

const ClientPage = () => {
	const router = useRouter();
	const [editing, setEditing] = useState(router.query.edit || false);

	const { data: client, error } = trpc.clients.byId.useQuery({
		id: String(router.query.id),
	});

	if (error) return <div>Error</div>;
	if (!client) return <Loading />;

	return (
		<Styles.ClientPage>
			{editing ? (
				<ClientForm
					initialValues={client}
					returnFunction={() => {
						router.push("/clients");
					}}
				/>
			) : (
				<Styles.Content>
					<h1>{client.name}</h1>
					<Button onClick={() => setEditing(true)}>Edit</Button>
					<div>
						<p>Client Number: {client.number}</p>
						<p>Bill To: {client.billTo ?? "Not Set"}</p>
					</div>
				</Styles.Content>
			)}
		</Styles.ClientPage>
	);
};

export default ClientPage;
