import React, {  } from "react";
import useSWR from "swr";
import { Activity, Client, Invoice } from "@prisma/client";
import Table from "src/molecules/Table";
import SingleInvoice from "../molecules/SingleInvoice";

const getInvoices = async () => {
	const response = await fetch("/api/invoices");

	return (await response.json()) as (Invoice & {
		activities: Activity[];
		client: Client;
	})[];
};

export default function InvoiceList() {
	const { data: invoices, error } = useSWR("/api/invoices", getInvoices);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoices) return <div>loading...</div>;

	return (
		<Table>
			<tbody>
				<tr key="Header">
					<th>Invoice No.</th>
					<th>Date</th>
					<th>Name</th>
					<th>No. Activities</th>
					<th>Total</th>
					<th> </th>
				</tr>
				{invoices.map((invoice) => (
					<SingleInvoice invoice={invoice} key={invoice.id} />
				))}
			</tbody>
		</Table>
	);
}
