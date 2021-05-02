import React, { useState, useEffect } from "react";
import firebase from "firebase/app";
import { deleteInvoice, streamInvoices } from "../shared/utils/firebase";
import { Invoice as InvoiceType } from "../types";
import { getTotalString } from "../shared/utils/helpers";
import Button from "../shared/components/Button";
import generatePDF from "../shared/utils/pdf-generation";

const Invoice = ({ invoice }: { invoice: InvoiceType }) => {
	const [cost, setTotalCost] = useState<null | string>(null);

	useEffect(() => {
		getTotalString(invoice).then((costString) => setTotalCost(costString));
	}, [invoice]);

	return (
		<tr>
			<td>{invoice.invoice_no}</td>
			<td>{invoice.client_name}</td>
			<td>{invoice.client_no}</td>
			<td>
				<Button onClick={() => generatePDF(invoice)}>Generate PDF</Button>
			</td>
			<td>{cost}</td>
			<td>
				<button
					className="button has-background-danger has-text-white has-text-weight-bold"
					onClick={() => {
						deleteInvoice(invoice.invoice_no);
					}}
					type="button"
				>
					X
				</button>
			</td>
		</tr>
	);
};

export default function InvoiceList() {
	const [invoices, setInvoices] = useState<InvoiceType[]>([]);

	useEffect(() => {
		const unsubscribe = streamInvoices({
			next: (querySnapshot: firebase.firestore.QuerySnapshot) => {
				const updatedInvoices: InvoiceType[] = [];

				querySnapshot.forEach((document: firebase.firestore.DocumentData) => {
					const invoice: InvoiceType = document.data();
					updatedInvoices.push(invoice);
				});

				setInvoices(updatedInvoices);
			},
			error: () => console.error("Couldn't get invoices."),
		});
		return unsubscribe;
	}, []);

	return (
		<div className="content">
			<table className="table">
				<thead>
					<tr>
						<th>Invoice Number</th>
						<th>Client Name</th>
						<th>Client Number</th>
						<th>PDF</th>
						<th>Total</th>
						{/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
						<th />
					</tr>
				</thead>
				<tbody>
					{invoices.map((invoice: InvoiceType) => (
						<Invoice
							invoice={invoice}
							key={invoice.invoice_no + invoice.client_no}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}
