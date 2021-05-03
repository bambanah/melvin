import React, { useState } from "react";
import CreateInvoice from "./components/CreateInvoice";
import InvoiceList from "./components/InvoiceList";
import Button from "./shared/components/Button";
import { useAuth } from "./shared/hooks/use-auth";
import { signOut } from "./shared/utils/firebase";
import { Invoice } from "./types";

export default function Home() {
	const [creating, setCreating] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const auth = useAuth();

	const ToggleButton = () => (
		<Button
			className="button is-primary"
			onClick={() => setCreating(!creating)}
		>
			Create Invoice
		</Button>
	);

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

				<div className="section">
					{creating ? (
						<CreateInvoice
							invoiceToLoad={invoice}
							setInvoiceToLoad={setInvoice}
							setCreating={setCreating}
						/>
					) : (
						<ToggleButton />
					)}
				</div>

				<div className="section">
					<InvoiceList loadInvoice={loadInvoice} />
				</div>
			</div>
		</section>
	);
}
