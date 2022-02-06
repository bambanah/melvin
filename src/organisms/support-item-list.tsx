import Loading from "@atoms/loading";
import EntityList, { EntityListItem } from "@molecules/entity-list";
import { SupportItem } from "@prisma/client";
import React from "react";
import useSWR from "swr";

const getSupportItems = async () => {
	const response = await fetch("/api/support-items");

	return (await response.json()) as SupportItem[];
};

function SupportItemList() {
	const { data: supportItems, error } = useSWR(
		"/api/support-items",
		getSupportItems
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!supportItems) return <Loading />;

	const entities: EntityListItem[] = supportItems.map((supportItem) => ({
		id: supportItem.id,
		fields: [
			{ value: supportItem.description, type: "label", flex: "1 1 auto" },
			{
				value: supportItem.weekdayCode,
				icon: "id-card",
				type: "text",
				flex: "0 0 9.5em",
			},
			{
				value: `${supportItem.weekdayRate}`,
				icon: "dollar-sign",
				type: "text",
				flex: "0 0 5em",
			},
		],
	}));

	return (
		<EntityList title="Activities" route="/activities" entities={entities} />
	);
}

export default SupportItemList;
