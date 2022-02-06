import Button from "@atoms/button";
import Loading from "@atoms/loading";
import CreateInvoiceForm from "@organisms/forms/invoice-form";
import { Activity, Invoice } from "@prisma/client";
import { invoiceToValues } from "@utils/helpers";
import { useRouter } from "next/router";
import React, { useState } from "react";
import useSWR from "swr";
import * as Styles from "./styles";

const getInvoice = async (id: string) => {
	const response = await fetch(`/api/invoices/${id}`);

	return (await response.json()) as Invoice & { activities: Activity[] };
};

const InvoicePage = () => {
	const router = useRouter();
	const invoiceId = String(router.query.id);

	const [editing, setEditing] = useState(router.query.edit ?? false);

	const { data: invoice, error } = useSWR(`/api/invoices/${invoiceId}`, () =>
		getInvoice(invoiceId)
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoice) return <Loading />;

	return editing ? (
		<Styles.Container>
			<CreateInvoiceForm
				initialValues={invoiceToValues(invoice)}
				returnFunction={() => {
					setEditing(false);
					router.push(`/invoices/${invoice.id}`);
				}}
			/>
		</Styles.Container>
	) : (
		<Styles.Container>
			<p>This is a single invoice {invoice.invoiceNo}</p>
			<Button onClick={() => setEditing(true)}>Edit</Button>
		</Styles.Container>
	);
};

export default InvoicePage;
