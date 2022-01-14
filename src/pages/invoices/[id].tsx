import Layout from "@layouts/common/layout";
import InvoicePage from "@layouts/invoice-page";
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
