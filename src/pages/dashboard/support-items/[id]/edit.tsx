import Loading from "@/components/ui/loading";
import Layout from "@/components/shared/layout";
import SupportItemForm from "@/components/support-items/support-item-form";
import { trpc } from "@/lib/trpc";
import Head from "next/head";
import { useRouter } from "next/router";

const EditSupportItem = () => {
	const router = useRouter();
	const supportItemId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	const { data: supportItem, error } = trpc.supportItem.byId.useQuery({
		id: supportItemId ?? "",
	});

	if (error) {
		return <div>Error</div>;
	}

	if (!supportItem) {
		return (
			<Layout>
				<Loading />
			</Layout>
		);
	}

	return (
		<Layout>
			<Head>
				<title>{supportItem.description} - Melvin</title>
			</Head>
			<SupportItemForm existingSupportItem={supportItem} />
		</Layout>
	);
};

export default EditSupportItem;
