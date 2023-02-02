import Button from "@atoms/button";
import Loading from "@atoms/loading";
import CreateInvoiceForm from "@components/invoices/invoice-form";
import { invoiceToValues } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import { useRouter } from "next/router";
import { useState } from "react";
import * as Styles from "./styles";

const InvoicePage = () => {
	const router = useRouter();
	const invoiceId = String(router.query.id);

	const [editing, setEditing] = useState(router.query.edit ?? false);

	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId,
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoice) return <Loading />;

	return editing ? (
		<Styles.Container>
			<CreateInvoiceForm initialValues={invoiceToValues(invoice)} />
		</Styles.Container>
	) : (
		<Styles.Container>
			<p>This is a single invoice {invoice.invoiceNo}</p>
			<Button onClick={() => setEditing(true)}>Edit</Button>
		</Styles.Container>
	);
};

export default InvoicePage;
