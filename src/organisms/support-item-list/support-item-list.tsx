import Loading from "@atoms/loading";
import Card from "@molecules/card";
import CardContainer from "@molecules/card-container";
import { SupportItem } from "@prisma/client";
import React from "react";
import useSWR from "swr";
import * as Styles from "./styles";

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

	return (
		<Styles.Container>
			<CardContainer>
				{supportItems.map((supportItem) => (
					<Card href={`/activities/${supportItem.id}`} key={supportItem.id}>
						<h1>
							{supportItem.description.length > 25
								? `${supportItem.description.slice(0, 25)}...`
								: supportItem.description}
						</h1>
						<div>
							<p>{supportItem.weekdayCode}</p>
							<p>${supportItem.weekdayRate}/hr</p>
						</div>
					</Card>
				))}
				<Card href="/activities/create" create>
					<span>+</span>
				</Card>
			</CardContainer>
		</Styles.Container>
	);
}

export default SupportItemList;
