import Title from "@atoms/Title";
import Layout from "@layouts/common/Layout";
import InvoiceList from "@organisms/InvoiceList";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
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
				<title>Invoices</title>
			</Head>

			<Title>Invoices</Title>
			<Link href="/invoices/create">Create New Invoice</Link>

			<InvoiceList />
		</Layout>
	);
}
