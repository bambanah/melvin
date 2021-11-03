import { SupportItem } from "@prisma/client";
import React from "react";
import useSWR from "swr";
import Table from "../../shared/components/Table";
import Activity from "./SupportItem";

const getSupportItems = async () => {
	const response = await fetch("/api/support-item");

	return (await response.json()) as SupportItem[];
};

function SupportItemList() {
	// const [supportItems, setActivities] = useState<ActivityObject>({});
	const { data: supportItems, error } = useSWR(
		"/api/support-item",
		getSupportItems
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!supportItems) return <div>loading...</div>;

	return (
		<Table>
			<tbody>
				<tr>
					<th>Description</th>
					<th>Weekday Rate</th>
					<th>Weeknight Rate</th>
					<th>Saturday Rate</th>
					<th>Sunday Rate</th>
					{/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
					<th />
				</tr>
				{supportItems.map((supportItem) => (
					<Activity supportItem={supportItem} key={supportItem.id} />
				))}
			</tbody>
		</Table>
	);
}

export default SupportItemList;
