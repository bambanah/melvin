import InvoiceList from "@/components/invoices/invoice-list";
import Layout from "@/components/shared/layout";
import Head from "next/head";

export default function Invoices() {
	return (
		<Layout>
			<Head>
				<title>Invoices - Melvin</title>
			</Head>

			<InvoiceList />
		</Layout>
	);
}
