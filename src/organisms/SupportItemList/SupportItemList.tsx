import Card from "@molecules/Card";
import { SupportItem } from "@prisma/client";
import Link from "next/link";
import React from "react";
import useSWR from "swr";
import * as Styles from "./SupportItemList.styles";

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
	if (!supportItems) return <div>loading...</div>;

	return (
		<Styles.Container>
			<Styles.SupportItemList>
				<Link href="/activities/create">
					<Card className="create">
						<span>+</span>
					</Card>
				</Link>
				{supportItems.map((supportItem) => (
					<Link href={`/activities/${supportItem.id}`}>
						<Card>
							<h1>
								{supportItem.description.length > 25
									? supportItem.description.slice(0, 25) + "..."
									: supportItem.description}
							</h1>
							<div>
								<p>{supportItem.weekdayCode}</p>
								<p>${supportItem.weekdayRate}/hr</p>
							</div>
						</Card>
					</Link>
				))}
			</Styles.SupportItemList>
		</Styles.Container>
	);
}

export default SupportItemList;
