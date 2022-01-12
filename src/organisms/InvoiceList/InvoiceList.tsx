import Title from "@atoms/Title";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Activity, Client, Invoice } from "@prisma/client";
import dayjs from "dayjs";
import Link from "next/link";
import React, { useState } from "react";
import useSWR from "swr";
import * as Styles from "./InvoiceList.styles";
import PdfDocument from "@molecules/PdfDocument";

const getInvoices = async () => {
	const response = await fetch("/api/invoices");

	return (await response.json()) as (Invoice & {
		activities: Activity[];
		client: Client;
	})[];
};

export default function InvoiceList() {
	const { data: invoices, error } = useSWR("/api/invoices", getInvoices);

	const [expandedInvoice, expandInvoice] = useState<number | undefined>(
		undefined
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoices) return <div>loading...</div>;

	return (
		<Styles.Container>
			<Title>Invoices</Title>
			<Link href="/invoices/create">Create New Invoice</Link>
			{invoices.map((invoice, index) => (
				<Styles.InvoiceContainer
					className={expandedInvoice === index ? "expanded" : ""}
					key={invoice.id}
				>
					<Styles.Invoice
						onClick={() =>
							expandInvoice(expandedInvoice === index ? undefined : index)
						}
					>
						<Styles.Expander>
							<FontAwesomeIcon icon={["fas", "chevron-right"]} size="2x" />
						</Styles.Expander>
						<Styles.Column>
							<h2>{invoice.invoiceNo}</h2>
							<span>{dayjs(invoice.date).format("DD/MM/YYYY")}</span>
						</Styles.Column>

						<Styles.Column>
							<span>
								<b>{invoice.client.name}</b>
							</span>
							<span>$1234.56</span>
						</Styles.Column>
					</Styles.Invoice>
					<Styles.PdfPreview>
						<PdfDocument invoiceNo={invoice.id} />
					</Styles.PdfPreview>
				</Styles.InvoiceContainer>
			))}
		</Styles.Container>
	);
}
