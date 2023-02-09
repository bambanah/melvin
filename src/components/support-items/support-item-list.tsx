import EntityList, { EntityListItem } from "@components/shared/entity-list";
import {
	faDollarSign,
	faEdit,
	faIdCard,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { SupportItemFetchAllOutput } from "@server/routers/support-item-router";
import { trpc } from "@utils/trpc";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";

function SupportItemList() {
	const utils = trpc.useContext();
	const deleteMutation = trpc.supportItem.delete.useMutation();

	const { data: { supportItems } = {}, error } = trpc.supportItem.list.useQuery(
		{}
	);

	const generateEntity = (
		supportItem?: SupportItemFetchAllOutput
	): EntityListItem => ({
		id: supportItem?.id || "",
		fields: [
			{
				value: supportItem ? supportItem.description : <Skeleton />,
				type: "label",
				flex: "1 1 auto",
			},
			{
				value: supportItem ? supportItem.weekdayCode : <Skeleton />,
				icon: faIdCard,
				type: "text",
				flex: "0 0 9.5em",
			},
			{
				value: supportItem ? `${supportItem.weekdayRate}` : <Skeleton />,
				icon: faDollarSign,
				type: "text",
				flex: "0 0 5em",
			},
		],
		actions: supportItem
			? [
					{
						value: "Edit",
						type: "link",
						icon: faEdit,
						href: `/support-items/${supportItem.id}?edit=true`,
					},
					{
						value: "Delete",
						type: "button",
						icon: faTrash,
						onClick: () => {
							if (
								confirm(
									`Are you sure you want to delete ${supportItem.description}?`
								)
							) {
								deleteMutation
									.mutateAsync({ id: supportItem.id })
									.then(() => {
										utils.supportItem.list.invalidate();
										toast.success("Support Item deleted");
									})
									.catch((error) => toast.error(error));
							}
						},
					},
			  ]
			: [],
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	if (!supportItems)
		return <EntityList title="Support Items" entities={[generateEntity()]} />;

	return (
		<EntityList
			title="Support Items"
			route="/support-items"
			entities={supportItems.map((supportItem) => generateEntity(supportItem))}
		/>
	);
}

export default SupportItemList;
