import React, { useState } from "react";
import CreateInvoice from "./components/CreateInvoice";
import InvoiceList from "./components/InvoiceList";
import Button from "./shared/components/Button";

export default function Home() {
	const [creating, setCreating] = useState(false);

	const ToggleButton = () => {
		return (
			<Button primary onClick={() => setCreating(!creating)}>
				Create Invoice
			</Button>
		);
	};

	return (
		<section className="section">
			<div className="container">
				<h1 className="title">Invoices</h1>

				<div className="section">
					{creating ? (
						<CreateInvoice setCreating={setCreating} />
					) : (
						<ToggleButton />
					)}
				</div>

				<div className="section">
					<InvoiceList />
				</div>
			</div>
		</section>
	);
}
