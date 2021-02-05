import React, { useState, useEffect } from "react";
import { streamInvoices } from "../services/firebase";
import firebase from "firebase/app";
import { Invoice as InvoiceType } from "../types";
import GeneratePDF from "./pdf/GeneratePDF";

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
			error: () => console.error("grocery-list-item-get-fail"),
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

const Invoice = ({ invoice }: { invoice: InvoiceType }) => {
	return (
		<tr>
			<td>{invoice.invoice_no}</td>
			<td>{invoice.client_name}</td>
			<td>{invoice.client_no}</td>
			<td>
				<GeneratePDF invoice={invoice} />
			</td>
		</tr>
	);
};
