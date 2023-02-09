import EntityList from "@components/shared/entity-list";
import { EntityListItem } from "@components/shared/entity-list/entity-list";
import {
	faEdit,
	faIdCard,
	faTrash,
	faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { ClientListOutput } from "@server/routers/client-router";
import { trpc } from "@utils/trpc";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from "react-toastify";

const ClientList = () => {
	const utils = trpc.useContext();

	const { data: { clients } = {}, error } = trpc.clients.list.useQuery({});
	const deleteClientMutation = trpc.clients.delete.useMutation();

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	const generateEntity = (client?: ClientListOutput): EntityListItem => ({
		id: client ? client?.id || "" : "loading",
		fields: [
			{
				value: client ? client?.name || "N/A" : <Skeleton />,
				type: "label",
				flex: "1 1 100%",
			},
			{
				value: client ? client?.number || "N/A" : <Skeleton />,
				icon: faIdCard,
				type: "text",
				flex: "1 0 7.2em",
			},
			{
				value: client ? client?.billTo || "N/A" : <Skeleton />,
				icon: faWallet,
				type: "text",
				flex: "0 0 9.7em",
			},
		],
		actions: client
			? [
					{
						value: "New Invoice",
						type: "link",
						href:
							client.invoices.length > 0
								? `/invoices/create?copyFrom=${client.invoices[0].id}`
								: `/invoices/create?for=${client.id}`,
					},
					{
						value: "Edit",
						type: "link",
						icon: faEdit,
						href: `/clients/${client.id}?edit=true`,
					},
					{
						value: "Delete",
						type: "button",
						icon: faTrash,
						onClick: () => {
							if (confirm(`Are you sure you want to delete ${client.name}?`)) {
								deleteClientMutation.mutateAsync(
									{ id: client.id },
									{
										onSuccess: () => {
											utils.clients.list.invalidate();
											toast.success("Client deleted2");
										},
										onError: (error) => toast.error(error.message),
									}
								);
							}
						},
					},
			  ]
			: [],
	});

	if (!clients)
		return (
			<EntityList
				title="Clients"
				route="/clients"
				entities={
					Array.from({ length: 3 }).fill(generateEntity()) as EntityListItem[]
				}
			/>
		);

	return (
		<EntityList
			title="Clients"
			route="/clients"
			entities={clients.map((client) => generateEntity(client))}
		/>
	);
};

export default ClientList;
