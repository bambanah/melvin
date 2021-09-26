import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useSWR from "swr";
import axios from "axios";
import jsPDF from "jspdf";
import { getTotalString } from "../../shared/utils/helpers";
import Table from "../../shared/components/Table";
import { Activity, Invoice } from ".prisma/client";

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

const getInvoices = async () => {
	const response = await fetch("/api/invoices");

	return (await response.json()) as Invoice[];
};

const deleteInvoice = async (invoiceId: string) => {
	await axios.delete(`http://localhost:3000/${invoiceId}`).then((res) => {
		console.log(res.data);
	});
};

const generatePDF = async (invoiceId: string) => {
	await axios.get(`http://localhost:3000/${invoiceId}`).then((res) => {
		console.log(res.data);
		const pdf: jsPDF = res.data;

		pdf.save();
	});
};

const SingleInvoice = ({
	invoice,
	setInvoice,
	invoiceId,
}: {
	invoice: Invoice & {
		activities: Activity[];
	};
	setInvoice: (invoice: Invoice, editing?: boolean, invoiceId?: string) => void;
	invoiceId: string;
}) => {
	const [cost, setTotalCost] = useState<null | string>(null);

	useEffect(() => {
		getTotalString(invoice.id).then((costString) => setTotalCost(costString));
	}, [invoice]);

	return (
		<InvoiceRow>
			<TableCell>{invoice.invoiceNo}</TableCell>
			<TableCell>{invoice.clientId}</TableCell>
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
						onClick={() => generatePDF(invoice.id)}
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
	setInvoice: (invoice: Invoice, editing?: boolean) => void;
}) {
	const { data: invoices, error } = useSWR("/api/activities", getInvoices);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoices) return <div>loading...</div>;

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
				{invoices.map((invoice) => (
					<SingleInvoice
						invoice={invoice}
						invoiceId={invoice.id}
						key={invoice.id}
						setInvoice={setInvoice}
					/>
				))}
			</tbody>
		</InvoiceTable>
	);
}
