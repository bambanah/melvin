import { useSession } from "next-auth/react";
import Head from "next/head";
import React, { useState } from "react";
import styled from "styled-components";
import CreateInvoice from "src/organisms/CreateInvoice";
import InvoiceList from "src/organisms/InvoiceList";
import Button from "src/atoms/Button";
import Layout from "src/layouts/common/Layout";
import Title from "src/atoms/Title";

const CreateInvoiceSection = styled.div`
	background-color: #f1f1f1;

	padding: 1.5rem;
	border-radius: 4px;
	box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
`;

const Content = styled.div`
	padding: 0 1em;
`;

export default function Invoices() {
	const { status } = useSession({
		required: true,
	});

	const [creating, setCreating] = useState(false);

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<Head>
				<title>Invoices</title>
			</Head>
			{creating && (
				<CreateInvoiceSection className={`section ${creating && "expanded"}`}>
					<CreateInvoice setCreating={setCreating} />
				</CreateInvoiceSection>
			)}

			<Content>
				<Title>Invoices</Title>
				{!creating && (
					<Button primary onClick={() => setCreating(!creating)}>
						Create New Invoice
					</Button>
				)}

				<InvoiceList />
			</Content>
		</Layout>
	);
}
