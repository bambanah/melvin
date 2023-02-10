import Loading from "@atoms/loading";
import ClientForm from "@components/clients/client-form";
import Layout from "@components/shared/layout";
import { trpc } from "@utils/trpc";
import Head from "next/head";
import { useRouter } from "next/router";

const EditClient = () => {
	const router = useRouter();
	const clientId = String(router.query.id);

	const { data: client, error } = trpc.clients.byId.useQuery({
		id: clientId,
	});

	if (error) {
		return <div>Error</div>;
	}

	if (!client) {
		return (
			<Layout>
				<Loading />
			</Layout>
		);
	}

	return (
		<Layout>
			<Head>
				<title>Modifying {client.name} - Melvin</title>
			</Head>
			<ClientForm existingClient={client} />
		</Layout>
	);
};

export default EditClient;
