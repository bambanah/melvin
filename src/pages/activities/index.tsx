import { useSession } from "next-auth/react";
import React from "react";
import SupportItemList from "@organisms/SupportItemList";
import Layout from "@layouts/common/Layout";
import Title from "@atoms/Title";
import NavLink from "@molecules/NavLink";

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

			<NavLink href="/activities/create">Create New</NavLink>

			<SupportItemList />
		</Layout>
	);
}

export default SupportItems;
