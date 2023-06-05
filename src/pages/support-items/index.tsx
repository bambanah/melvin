import Layout from "@components/shared/layout";
import SupportItemList from "@components/support-items/support-item-list";
import { useSession } from "next-auth/react";

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
