import Head from "next/head";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Button from "../components/Button";
import ButtonGroup from "../components/ButtonGroup";
import CreateInvoice from "../components/CreateInvoice";
import InvoiceList from "../components/InvoiceList";
import Layout from "../components/Layout";
import TemplateList from "../components/TemplateList";
import { useAuth } from "../shared/hooks/useAuth";
import { Invoice } from "../shared/types";
import { signOut } from "../shared/utils/firebase";

const CreateInvoiceSection = styled.div`
	background-color: #f1f1f1;

	padding: 1.5rem;
	border-radius: 4px;
	box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
`;

export default function Home() {
	const [creating, setCreating] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const { user } = useAuth();

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
			<section className="section">
				<div className="container">
					<div className="is-flex is-flex-direction-row is-justify-content-space-between">
						<h1 className="title">Invoices</h1>
						<div className="is-flex is-flex-direction-row ">
							{user && <span className="mr-2 mt-2">{user.email}</span>}
							<Button onClick={() => signOut()}>Log Out</Button>
						</div>
					</div>

					<CreateInvoiceSection className={`section ${creating && "expanded"}`}>
						{creating ? (
							<CreateInvoice
								invoiceToLoad={invoice}
								setCreating={setCreating}
							/>
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
				</div>
			</section>
		</Layout>
	);
}
