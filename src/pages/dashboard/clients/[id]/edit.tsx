import Loading from "@/components/ui/loading";
import NotFound from "@/components/ui/not-found";
import ClientForm from "@/components/clients/client-form";
import Layout from "@/components/shared/layout";
import { trpc } from "@/lib/trpc";
import Head from "next/head";
import { useRouter } from "next/router";

const EditClient = () => {
	const router = useRouter();
	const clientId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	const { data: client, error } = trpc.clients.byId.useQuery(
		{
			id: clientId ?? ""
		},
		{ enabled: !!clientId }
	);

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
