import Loading from "@atoms/loading";
import NotFound from "@atoms/not-found";
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
		return (
			<Layout>
				{error.data?.code === "NOT_FOUND" ? (
					<NotFound />
				) : (
					<div>
						<span>An error occurred</span>
						<span>{error.message}</span>
					</div>
				)}
			</Layout>
		);
	}

	return (
		<Layout>
			{client ? (
				<>
					<Head>
						<title>Modifying {client.name} - Melvin</title>
					</Head>
					<ClientForm existingClient={client} />
				</>
			) : (
				<Loading />
			)}
		</Layout>
	);
};

export default EditClient;
