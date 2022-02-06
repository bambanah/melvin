import Button from "@atoms/button";
import Display from "@atoms/display";
import Heading from "@atoms/heading";
import Loading from "@atoms/loading";
import { SupportItem } from "@prisma/client";
import Link from "next/link";
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
			<Styles.Header>
				<Display className="small">Activities</Display>
				<Link href="/activities/create" passHref>
					<Button primary>+ Add New</Button>
				</Link>
			</Styles.Header>
			<Styles.SupportItemList>
				{supportItems.map((supportItem) => (
					<Link
						key={supportItem.id}
						href={`/activities/${supportItem.id}`}
						passHref
					>
						<Styles.SupportItem>
							<Heading className="small">{supportItem.description}</Heading>
							<span className="code">{supportItem.weekdayCode}</span>
							<span className="rate">${supportItem.weekdayRate}/hr</span>
						</Styles.SupportItem>
					</Link>
				))}
			</Styles.SupportItemList>
		</Styles.Container>
	);
}

export default SupportItemList;
