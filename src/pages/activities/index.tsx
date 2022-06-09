import { useSession } from "next-auth/react";
import React from "react";
import SupportItemList from "@organisms/support-item-list";
import Layout from "@layouts/common/layout";

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
