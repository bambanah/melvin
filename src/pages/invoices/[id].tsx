import Layout from "@layouts/common/Layout";
import InvoicePage from "@layouts/InvoicePage";
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
