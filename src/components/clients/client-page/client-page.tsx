import Loading from "@atoms/loading";
import { trpc } from "@utils/trpc";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import * as Styles from "./styles";

const ClientPage = () => {
	const router = useRouter();

	const { data: client, error } = trpc.clients.byId.useQuery({
		id: String(router.query.id),
	});

	if (error) {
		console.error(error);
		return <div>Error</div>;
	}
	if (!client) return <Loading />;

	return (
		<Styles.ClientPage>
			<Head>
				<title></title>
			</Head>
			<Styles.Content>
				<h1>{client.name}</h1>
				<Link href={`/clients/${client.id}/edit`}>Edit</Link>
				<div>
					<p>Client Number: {client.number}</p>
					<p>Bill To: {client.billTo ?? "Not Set"}</p>
				</div>
			</Styles.Content>
		</Styles.ClientPage>
	);
};

export default ClientPage;
