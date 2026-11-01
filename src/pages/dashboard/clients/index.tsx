import ClientList from "@/components/clients/client-list";
import { WeekGrid } from "@/components/regular-time-prototype/variant-d-week-grid";
import Layout from "@/components/shared/layout";
import Head from "next/head";

const Clients = () => {
	return (
		<Layout>
			<Head>
				<title>Clients - Melvin</title>
			</Head>
			{/* PROTOTYPE (#502) */}
			<WeekGrid />
			<ClientList />
		</Layout>
	);
};

export default Clients;
