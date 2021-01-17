import React from "react";
import CreateInvoice from "./components/CreateInvoice";
import InvoiceList from "./components/InvoiceList";

function App() {
	return (
		<section className="section">
			<div className="container">
				<h1 className="title">Invoices</h1>

				<div className="section">
					<CreateInvoice />
				</div>

				<div className="section">
					<InvoiceList />
				</div>
			</div>
		</section>
	);
}

export default App;
