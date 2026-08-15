import Layout from "@/components/shared/layout";
import SupportItemForm from "@/components/support-items/support-item-form";
import Head from "next/head";

const CreateSupportItem = () => {
	return (
		<Layout>
			<Head>
				<title>Create Support Item | Melvin</title>
			</Head>
			<SupportItemForm />
		</Layout>
	);
};

export default CreateSupportItem;
