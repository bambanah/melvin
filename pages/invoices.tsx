import Head from "next/head";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Button from "../shared/components/Button";
import CreateInvoice from "../components/invoices/CreateInvoice";
import InvoiceList from "../components/invoices/InvoiceList";
import Layout from "../shared/components/Layout";
import Title from "../shared/components/text/Title";
import { Invoice } from "../shared/types";

const CreateInvoiceSection = styled.div`
	background-color: #f1f1f1;

	padding: 1.5rem;
	border-radius: 4px;
	box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
`;

const Content = styled.div`
	padding: 0 1em;
`;

export default function Home() {
	const [creating, setCreating] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
	const [isEditing, setIsEditing] = useState(false);

	// Set creating whenever an invoice is added
	useEffect(() => {
		if (invoice) setCreating(true);
	}, [invoice]);

	// When creation is cancelled, wipe the loaded invoice
	useEffect(() => {
		if (!creating) {
			setInvoice(null);
			setIsEditing(false);
			setInvoiceId(undefined);
		}
	}, [creating]);

	function loadInvoice(
		invoiceToLoad: Invoice,
		editing: boolean = false,
		invoiceToLoadId: string | undefined = undefined
	) {
		setIsEditing(editing);
		setInvoiceId(invoiceToLoadId);
		setInvoice(invoiceToLoad);
	}

	return (
		<Layout>
			<Head>
				<title>Invoices</title>
			</Head>
			{creating && (
				<CreateInvoiceSection className={`section ${creating && "expanded"}`}>
					<CreateInvoice
						invoiceToLoad={invoice}
						setCreating={setCreating}
						editPrevious={isEditing}
						invoiceId={invoiceId}
					/>
				</CreateInvoiceSection>
			)}

			<Content>
				<Title>Invoices</Title>
				{!creating && (
					<Button primary onClick={() => setCreating(!creating)}>
						Create New Invoice
					</Button>
				)}
				<InvoiceList setInvoice={loadInvoice} />
			</Content>
		</Layout>
	);
}
