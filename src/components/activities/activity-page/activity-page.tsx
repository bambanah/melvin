import Button from "@atoms/button";
import ActivityForm from "@components/activities/activity-form";
import { trpc } from "@utils/trpc";
import dayjs from "dayjs";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import * as Styles from "./styles";

const SupportItemPage = () => {
	const router = useRouter();
	const supportItemId = String(router.query.id);

	const { data: activity, error } = trpc.activity.byId.useQuery({
		id: supportItemId,
	});

	const [editing, setEditing] = useState(router.query.edit || false);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!activity) return <div>loading...</div>;

	return (
		<Styles.Container>
			<Head>
				<title>
					{dayjs(activity.date).format("dd/mm")} -{" "}
					{activity.supportItem.description} - Melvin
				</title>
			</Head>
			{editing ? (
				<>
					<ActivityForm
						initialValues={activity}
						returnFunction={() => router.push("/activities")}
					/>
				</>
			) : (
				<Styles.Content>
					<Link href="/activities">&lt; Back to Activities</Link>
					<h1>{activity.supportItem.description}</h1>
					<p>{dayjs(activity.date).format("DD/MM/YY")}</p>

					<Button onClick={() => setEditing(true)}>Edit</Button>

					<a href={`/clients/${activity.client.id}`}>{activity.client.name}</a>
					<p>Start Time: {dayjs(activity.startTime).format("hh:mma")}</p>
					<p>End Time: {dayjs(activity.endTime).format("hh:mma")}</p>
				</Styles.Content>
			)}
		</Styles.Container>
	);
};

export default SupportItemPage;
