import Head from "next/head";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Button from "../components/shared/Button";
import ButtonGroup from "../components/shared/ButtonGroup";
import CreateInvoice from "../components/CreateInvoice";
import InvoiceList from "../components/InvoiceList";
import Layout from "../components/shared/Layout";
import TemplateList from "../components/TemplateList";
import Title from "../components/shared/text/Title";
import { Invoice } from "../shared/types";

const CreateInvoiceSection = styled.div`
	background-color: #f1f1f1;

	padding: 1.5rem;
	border-radius: 4px;
	box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
`;

export default function Home() {
	const [creating, setCreating] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);

	// Set creating whenever an invoice is added
	useEffect(() => {
		if (invoice) setCreating(true);
	}, [invoice]);

	// When creation is cancelled, wipe the loaded invoice
	useEffect(() => {
		if (!creating) setInvoice(null);
	}, [creating]);

	return (
		<Layout>
			<Head>
				<title>Invoices</title>
			</Head>
			<Title>Invoices</Title>

			<CreateInvoiceSection className={`section ${creating && "expanded"}`}>
				{creating ? (
					<CreateInvoice invoiceToLoad={invoice} setCreating={setCreating} />
				) : (
					<ButtonGroup>
						<Button primary onClick={() => setCreating(!creating)}>
							Create Invoice
						</Button>
						<TemplateList setInvoice={setInvoice} />
					</ButtonGroup>
				)}
			</CreateInvoiceSection>

			<div className="section">
				<InvoiceList setInvoice={setInvoice} />
			</div>
		</Layout>
	);
}
