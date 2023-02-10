import Layout from "@components/shared/layout";
import InvoiceList from "@components/invoices/invoice-list";
import { useSession } from "next-auth/react";
import Head from "next/head";
import React from "react";

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
