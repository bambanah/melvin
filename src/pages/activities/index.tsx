import { useSession } from "next-auth/react";
import React from "react";
import SupportItemList from "@organisms/SupportItemList";
import Layout from "@layouts/common/Layout";
import Title from "@atoms/Title";
import Link from "next/link";

function SupportItems() {
	const { status } = useSession({
		required: true,
	});

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<Title>Activities</Title>

			<Link href="/activities/create">
				<a>Create New Activity</a>
			</Link>

			<SupportItemList />
		</Layout>
	);
}

export default SupportItems;
