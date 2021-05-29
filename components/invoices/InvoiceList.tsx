import firebase from "firebase/app";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Invoice as InvoiceType, InvoiceObject } from "../../shared/types";
import { deleteInvoice, streamInvoices } from "../../shared/utils/firebase";
import { getTotalString } from "../../shared/utils/helpers";
import generatePDF from "../../shared/utils/pdf-generation";
import Table from "../../shared/components/Table";

const InvoiceTable = styled(Table)``;

const InvoiceRow = styled.tr`
	&:hover {
		background-color: #eee;
	}
`;

const Actions = styled.div`
	display: flex;
	justify-content: right;
	align-items: center;
	gap: 0.6rem;
`;

const Action = styled(FontAwesomeIcon)`
	cursor: pointer;

	&:hover {
		color: #777;
	}
`;

const TableCell = styled.td`
	padding: 1rem 0.5rem;
`;

const Invoice = ({
	invoice,
	setInvoice,
	invoiceId,
}: {
	invoice: InvoiceType;
	setInvoice: (
		invoice: InvoiceType,
		editing?: boolean,
		invoiceId?: string
	) => void;
	invoiceId: string;
}) => {
	const [cost, setTotalCost] = useState<null | string>(null);

	useEffect(() => {
		getTotalString(invoice).then((costString) => setTotalCost(costString));
	}, [invoice]);

	return (
		<InvoiceRow>
			<TableCell>{invoice.invoice_no}</TableCell>
			<TableCell>{invoice.client_name}</TableCell>
			<TableCell>{invoice.activities.length}</TableCell>

			<TableCell>{cost}</TableCell>
			<TableCell>
				<Actions>
					<Action
						onClick={() => setInvoice(invoice, true, invoiceId)}
						icon="edit"
						size="lg"
					/>
					<Action onClick={() => setInvoice(invoice)} icon="copy" size="lg" />
					<Action
						onClick={() => generatePDF(invoice)}
						icon="file-download"
						size="lg"
					/>
					<Action
						onClick={() => {
							deleteInvoice(invoiceId);
						}}
						icon="times"
						size="lg"
					/>
				</Actions>
			</TableCell>
		</InvoiceRow>
	);
};

export default function InvoiceList({
	setInvoice,
}: {
	setInvoice: (invoice: InvoiceType, editing?: boolean) => void;
}) {
	const [invoices, setInvoices] = useState<InvoiceObject>({});

	useEffect(() => {
		const unsubscribe = streamInvoices({
			next: (querySnapshot: firebase.firestore.QuerySnapshot) => {
				const updatedInvoices: InvoiceObject = {};

				querySnapshot.forEach((document: firebase.firestore.DocumentData) => {
					const invoice: InvoiceType = document.data();
					updatedInvoices[document.id] = invoice;
				});

				setInvoices(updatedInvoices);
			},
			error: () => console.error("Couldn't get invoices."),
		});
		return unsubscribe;
	}, []);

	return (
		<InvoiceTable>
			<tbody>
				<tr key="Header">
					<th>Invoice No.</th>
					<th>Name</th>
					<th>No. Activities</th>
					<th>Total</th>
					{/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
					<th />
				</tr>
				{Object.keys(invoices).map((invoiceId: string) => (
					<Invoice
						invoice={invoices[invoiceId]}
						invoiceId={invoiceId}
						key={invoiceId}
						setInvoice={setInvoice}
					/>
				))}
			</tbody>
		</InvoiceTable>
	);
}
