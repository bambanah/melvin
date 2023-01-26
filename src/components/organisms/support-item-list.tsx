import {
	faDollarSign,
	faEdit,
	faIdCard,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";
import EntityList, { EntityListItem } from "@molecules/entity-list";
import { SupportItem } from "@prisma/client";
import axios from "axios";
import React from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import useSWR, { mutate } from "swr";

const getSupportItems = async () => {
	const response = await fetch("/api/support-items");

	return (await response.json()) as SupportItem[];
};

const generateEntity = (supportItem?: SupportItem): EntityListItem => ({
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
					href: `/activities/${supportItem.id}?edit=true`,
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
							axios
								.delete(`/api/support-items/${supportItem.id}`)
								.then(() => {
									mutate("/api/support-items");
									toast.success("Activity deleted");
								})
								.catch((error) => toast.error(error));
						}
					},
				},
		  ]
		: [],
});

function SupportItemList() {
	const { data: supportItems, error } = useSWR(
		"/api/support-items",
		getSupportItems
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	if (!supportItems)
		return <EntityList title="Activities" entities={[generateEntity()]} />;

	return (
		<EntityList
			title="Activities"
			route="/activities"
			entities={supportItems.map((supportItem) => generateEntity(supportItem))}
		/>
	);
}

export default SupportItemList;
