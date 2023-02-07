import Button from "@atoms/button";
import CreateSupportItemForm from "@components/support-items/support-item-formik";
import { RateType } from "@prisma/client";
import { trpc } from "@utils/trpc";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import * as Styles from "./styles";

const SupportItemPage = () => {
	const router = useRouter();
	const supportItemId = String(router.query.id);

	const { data: supportItem, error } = trpc.supportItem.byId.useQuery({
		id: supportItemId,
	});

	const [editing, setEditing] = useState(router.query.edit || false);

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
					<CreateSupportItemForm
						initialValues={supportItem}
						returnFunction={() => router.push("/support-items")}
					/>
				</>
			) : (
				<Styles.Content>
					<Link href="/support-items">&lt; Back to Support Items</Link>
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

export default SupportItemPage;
