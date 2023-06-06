import ClientPage from "@components/clients/client-list";
import Layout from "@components/shared/layout";
import Head from "next/head";

const Clients = () => {
	return (
		<Layout>
			<Head>
				<title>Clients - Melvin</title>
			</Head>
			<ClientPage />
		</Layout>
	);
};

export default Clients;
