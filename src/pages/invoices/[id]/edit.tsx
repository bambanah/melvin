import Loading from "@atoms/loading";
import InvoiceForm from "@components/invoices/invoice-form";
import Layout from "@components/shared/layout";
import { InvoiceSchema } from "@schema/invoice-schema";
import { trpc } from "@utils/trpc";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const EditInvoice = () => {
	const router = useRouter();
	const invoiceId = String(router.query.id);

	const trpcContext = trpc.useContext();
	const modifyInvoiceMutation = trpc.invoice.modify.useMutation();

	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId,
	});

	if (error) {
		return (
			<Layout>
				<div>Error</div>
			</Layout>
		);
	}

	if (!invoice) {
		return (
			<Layout>
				<Loading />
			</Layout>
		);
	}

	const onSubmit = (invoiceData: InvoiceSchema) => {
		modifyInvoiceMutation
			.mutateAsync({ id: invoice.id, invoice: invoiceData })
			.then(() => {
				trpcContext.invoice.list.invalidate();
				trpcContext.invoice.byId.invalidate({ id: invoice.id });

				toast.success("Invoice updated");
				router.back();
			});
	};

	return (
		<Layout>
			<Head>
				<title>{invoice.invoiceNo} - Melvin</title>
			</Head>
			<InvoiceForm initialValues={invoice} onSubmit={onSubmit} />
		</Layout>
	);
};

export default EditInvoice;
