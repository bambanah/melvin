import Button from "@atoms/button";
import CreateActivityForm from "@organisms/forms/create-activity-form";
import { RateType, SupportItem } from "@prisma/client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import useSWR from "swr";
import * as Styles from "./styles";

const getActivity = async (id: string) => {
	const response = await fetch(`/api/support-items/${id}`);

	return (await response.json()) as SupportItem;
};

const ActivityPage = () => {
	const router = useRouter();
	const supportItemId = String(router.query.id);

	const { data: supportItem, error } = useSWR(
		`/api/support-items/${supportItemId}`,
		() => getActivity(supportItemId)
	);

	const [editing, setEditing] = useState(false);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!supportItem) return <div>loading...</div>;

	const rateType = supportItem.rateType === RateType.HOUR ? "hr" : "km";

	return (
		<Styles.Container>
			<Head>
				<title>{supportItem.description} - Melvin</title>
			</Head>
			{editing ? (
				<>
					<CreateActivityForm
						initialValues={supportItem}
						returnFunction={() => setEditing(false)}
					/>
				</>
			) : (
				<Styles.Content>
					<Link href="/activities">&lt; Back to activities</Link>
					<h1>{supportItem.description}</h1>
					<Button onClick={() => setEditing(true)}>Edit</Button>
					<p>
						Weekday: {supportItem.weekdayCode || "N/A"}{" "}
						{supportItem.weekdayRate
							? `\$${supportItem.weekdayRate}/${rateType}`
							: "N/A"}
					</p>
					<p>
						Weeknight: {supportItem.weeknightCode || "N/A"}{" "}
						{supportItem.weeknightRate
							? `\$${supportItem.weeknightRate}/${rateType}`
							: "N/A"}
					</p>
					<p>
						Saturday: {supportItem.saturdayCode || "N/A"}{" "}
						{supportItem.saturdayRate
							? `$${supportItem.saturdayRate}/${rateType}`
							: "N/A"}
					</p>
					<p>
						Sunday: {supportItem.sundayCode || "N/A"}{" "}
						{supportItem.sundayRate
							? `\$${supportItem.sundayRate}/${rateType}`
							: "N/A"}
					</p>
				</Styles.Content>
			)}
		</Styles.Container>
	);
};

export default ActivityPage;
