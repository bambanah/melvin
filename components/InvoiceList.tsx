import firebase from "firebase/app";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Invoice as InvoiceType } from "../shared/types";
import { deleteInvoice, streamInvoices } from "../shared/utils/firebase";
import { getTotalString } from "../shared/utils/helpers";
import generatePDF from "../shared/utils/pdf-generation";
import Button from "./shared/Button";

const InvoiceRow = styled.div`
	display: flex;
	justify-content: space-between;
	padding: 2rem;
	border-bottom: 1px solid #5e5e5e;

	&:hover {
		background-color: #eee;
		cursor: pointer;
	}
`;

const Invoice = ({
	invoice,
	setInvoice,
}: {
	invoice: InvoiceType;
	setInvoice: (invoice: InvoiceType) => void;
}) => {
	const [cost, setTotalCost] = useState<null | string>(null);

	useEffect(() => {
		getTotalString(invoice).then((costString) => setTotalCost(costString));
	}, [invoice]);

	return (
		<InvoiceRow
			onClick={() => {
				setInvoice(invoice);
			}}
		>
			<span>{invoice.invoice_no}</span>
			<span>{invoice.client_name}</span>
			<span>{invoice.client_no}</span>

			<Button onClick={() => generatePDF(invoice)}>Generate PDF</Button>
			<span>{cost}</span>
			<Button
				className="has-background-danger has-text-white has-text-weight-bold"
				onClick={() => {
					deleteInvoice(invoice.invoice_no);
				}}
				type="button"
			>
				X
			</Button>
		</InvoiceRow>
	);
};

export default function InvoiceList({
	setInvoice,
}: {
	setInvoice: (invoice: InvoiceType) => void;
}) {
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
			{invoices.map((invoice: InvoiceType) => (
				<Invoice
					invoice={invoice}
					key={invoice.invoice_no + invoice.client_no}
					setInvoice={setInvoice}
				/>
			))}
		</div>
	);
}
