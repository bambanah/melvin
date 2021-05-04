import React, { useState } from "react";
import styled from "styled-components";
import CreateInvoice from "./components/CreateInvoice";
import InvoiceList from "./components/InvoiceList";
import Button from "./shared/components/Button";
import ButtonGroup from "./shared/components/ButtonGroup";
import { useAuth } from "./shared/hooks/use-auth";
import { signOut } from "./shared/utils/firebase";
import { Invoice } from "./shared/types";
import TemplateList from "./components/TemplateList";

export default function Home() {
	const [creating, setCreating] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const auth = useAuth();

	const CreateInvoiceButton = () => (
		<Button
			className="button is-primary"
			onClick={() => setCreating(!creating)}
		>
			Create Invoice
		</Button>
	);

	const UseTemplateButton = () => (
		<Button className="button is-outlined">Create Invoice From Template</Button>
	);

	const CreateInvoiceSection = styled.div`
		background-color: #f1f1f1;

		padding: 1.5rem;
		border-radius: 4px;
		box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
	`;

	const loadInvoice = (invoiceToLoad: Invoice) => {
		setInvoice(invoiceToLoad);
		setCreating(true);
	};

	return (
		<section className="section">
			<div className="container">
				<div className="is-flex is-flex-direction-row is-justify-content-space-between 	">
					<h1 className="title">Invoices</h1>
					<div className="is-flex is-flex-direction-row ">
						{auth.user && <span className="mr-2 mt-2">{auth.user.email}</span>}
						<Button onClick={() => signOut()}>Log Out</Button>
					</div>
				</div>

				<CreateInvoiceSection className={`section ${creating && "expanded"}`}>
					{creating ? (
						<CreateInvoice
							invoiceToLoad={invoice}
							setInvoiceToLoad={setInvoice}
							setCreating={setCreating}
						/>
					) : (
						<ButtonGroup>
							<CreateInvoiceButton />
							<UseTemplateButton />
						</ButtonGroup>
					)}
				</CreateInvoiceSection>
				<div className="section">
					<TemplateList />
				</div>

				<div className="section">
					<InvoiceList loadInvoice={loadInvoice} />
				</div>
			</div>
		</section>
	);
}
