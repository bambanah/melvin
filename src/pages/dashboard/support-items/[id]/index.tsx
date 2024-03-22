import Layout from "@/components/shared/layout";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
const SupportItemPage = dynamic(
	() => import("@/components/support-items/support-item-page")
);

const Activity = () => {
	const router = useRouter();
	const supportItemId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	return (
		<Layout>
			{supportItemId && <SupportItemPage supportItemId={supportItemId} />}
		</Layout>
	);
};

export default Activity;
