import InvoiceList from "@components/invoices/invoice-list";
import Layout from "@components/shared/layout";
import { useSession } from "next-auth/react";
import Head from "next/head";

export default function Invoices() {
	const { status } = useSession({
		required: true,
	});

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<Head>
				<title>Invoices - Melvin</title>
			</Head>

			<InvoiceList />
		</Layout>
	);
}
