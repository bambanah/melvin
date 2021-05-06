import React, { useEffect, useState } from "react";
import styled from "styled-components";
import CreateInvoice from "./components/CreateInvoice";
import InvoiceList from "./components/InvoiceList";
import Button from "./shared/components/Button";
import ButtonGroup from "./shared/components/ButtonGroup";
import { useAuth } from "./shared/hooks/use-auth";
import { signOut } from "./shared/utils/firebase";
import { Invoice } from "./shared/types";
import TemplateList from "./components/TemplateList";

const CreateInvoiceSection = styled.div`
	background-color: #f1f1f1;

	padding: 1.5rem;
	border-radius: 4px;
	box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
`;

export default function Home() {
	const [creating, setCreating] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const auth = useAuth();

	// Set creating whenever an invoice is added
	useEffect(() => {
		if (invoice) setCreating(true);
	}, [invoice]);

	// When creation is cancelled, wipe the loaded invoice
	useEffect(() => {
		if (!creating) setInvoice(null);
	}, [creating]);

	return (
		<section className="section">
			<div className="container">
				<div className="is-flex is-flex-direction-row is-justify-content-space-between">
					<h1 className="title">Invoices</h1>
					<div className="is-flex is-flex-direction-row ">
						{auth.user && <span className="mr-2 mt-2">{auth.user.email}</span>}
						<Button onClick={() => signOut()}>Log Out</Button>
					</div>
				</div>

				<CreateInvoiceSection className={`section ${creating && "expanded"}`}>
					{creating ? (
						<CreateInvoice invoiceToLoad={invoice} setCreating={setCreating} />
					) : (
						<ButtonGroup>
							<Button
								className="button is-primary"
								onClick={() => setCreating(!creating)}
							>
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
	);
}
