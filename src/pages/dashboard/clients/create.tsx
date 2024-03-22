import ClientForm from "@/components/clients/client-form";
import Layout from "@/components/shared/layout";
import Head from "next/head";

const CreateClient = () => {
	return (
		<Layout>
			<Head>
				<title>Create Invoice - Melvin</title>
			</Head>
			<ClientForm />
		</Layout>
	);
};

export default CreateClient;
