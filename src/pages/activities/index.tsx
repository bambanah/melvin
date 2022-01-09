import { useSession } from "next-auth/react";
import React from "react";
import SupportItemList from "@organisms/SupportItemList/SupportItemList";
import Layout from "@layouts/common/Layout";

function SupportItems() {
	const { status } = useSession({
		required: true,
	});

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<SupportItemList />
		</Layout>
	);
}

export default SupportItems;
