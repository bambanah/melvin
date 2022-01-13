import Button from "@atoms/Button";
import Loading from "@atoms/Loading";
import CreateInvoiceForm from "@organisms/forms/CreateInvoiceForm";
import { Activity, Invoice } from "@prisma/client";
import { invoiceToValues } from "@utils/helpers";
import { useRouter } from "next/router";
import React, { useState } from "react";
import useSWR from "swr";
import * as Styles from "./InvoicePage.styles";

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

	if (editing) {
		return (
			<Styles.Container>
				<CreateInvoiceForm
					initialValues={invoiceToValues(invoice)}
					returnFunction={() => {
						setEditing(false);
						router.push(`/invoices/${invoice.id}`);
					}}
				/>
			</Styles.Container>
		);
	} else {
		return (
			<Styles.Container>
				<p>This is a single invoice {invoice.invoiceNo}</p>
				<Button onClick={() => setEditing(true)}>Edit</Button>
			</Styles.Container>
		);
	}
};

export default InvoicePage;
