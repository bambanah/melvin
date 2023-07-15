import ClientList from "@components/clients/client-list";
import Layout from "@components/shared/layout";
import Head from "next/head";

const Clients = () => {
	return (
		<Layout>
			<Head>
				<title>Clients - Melvin</title>
			</Head>
			<ClientList />
		</Layout>
	);
};

export default Clients;
