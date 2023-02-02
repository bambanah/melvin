import Layout from "@components/shared/layout";
import InvoicePage from "@components/invoices/invoice-page";
import Head from "next/head";
import React from "react";

const Invoice = () => {
	return (
		<Layout>
			<Head>
				<title>Melvin</title>
			</Head>
			<InvoicePage />
		</Layout>
	);
};

export default Invoice;
