import { faDollarSign, faIdCard } from "@fortawesome/free-solid-svg-icons";
import EntityList, { EntityListItem } from "@molecules/entity-list";
import { SupportItem } from "@prisma/client";
import React from "react";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";

const getSupportItems = async () => {
	const response = await fetch("/api/support-items");

	return (await response.json()) as SupportItem[];
};

const generateEntity = (supportItem?: SupportItem): EntityListItem => ({
	id: supportItem?.id || "",
	fields: [
		{
			value: !supportItem ? <Skeleton /> : supportItem.description,
			type: "label",
			flex: "1 1 auto",
		},
		{
			value: !supportItem ? <Skeleton /> : supportItem.weekdayCode,
			icon: faIdCard,
			type: "text",
			flex: "0 0 9.5em",
		},
		{
			value: !supportItem ? <Skeleton /> : `${supportItem.weekdayRate}`,
			icon: faDollarSign,
			type: "text",
			flex: "0 0 5em",
		},
	],
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
