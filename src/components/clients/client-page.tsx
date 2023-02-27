import Loading from "@atoms/loading";
import { trpc } from "@utils/trpc";
import Link from "next/link";
import { useRouter } from "next/router";

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
		<div className="flex flex-col items-center justify-center px-8">
			<div className="flex flex-col gap-4 px-3">
				<h1 className="m-0">{client.name}</h1>
				<Link href={`/clients/${client.id}/edit`}>Edit</Link>
				<div>
					<p>Client Number: {client.number}</p>
					<p>Bill To: {client.billTo ?? "Not Set"}</p>
				</div>
			</div>
		</div>
	);
};

export default ClientPage;
