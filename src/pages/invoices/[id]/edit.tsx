import Loading from "@atoms/loading";
import InvoiceForm from "@components/invoices/invoice-form";
import Layout from "@components/shared/layout";
import { invoiceToValues } from "@utils/formik-utils";
import { trpc } from "@utils/trpc";
import Head from "next/head";
import { useRouter } from "next/router";

const EditInvoice = () => {
	const router = useRouter();
	const invoiceId = String(router.query.id);

	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId,
	});

	if (error) {
		return <div>Error</div>;
	}

	if (!invoice) {
		return (
			<Layout>
				<Loading />
			</Layout>
		);
	}

	return (
		<Layout>
			<Head>
				<title>{invoice.invoiceNo} - Melvin</title>
			</Head>
			<InvoiceForm initialValues={invoiceToValues(invoice)} />
		</Layout>
	);
};

export default EditInvoice;
