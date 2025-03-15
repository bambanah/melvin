import Loading from "@/components/ui/loading";
import InvoiceForm from "@/components/invoices/invoice-form";
import Layout from "@/components/shared/layout";
import { InvoiceSchema } from "@/schema/invoice-schema";
import { trpc } from "@/lib/trpc";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const EditInvoice = () => {
	const router = useRouter();
	const invoiceId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	const trpcUtils = trpc.useUtils();
	const modifyInvoiceMutation = trpc.invoice.modify.useMutation();

	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId ?? ""
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
				trpcUtils.invoice.list.invalidate();
				trpcUtils.invoice.byId.invalidate({ id: invoice.id });

				toast.success("Invoice updated");
				router.back();
			});
	};

	return (
		<Layout>
			<Head>
				<title>
					{invoice.invoiceNo ? `${invoice.invoiceNo} - Melvin` : "Melvin"}
				</title>
			</Head>
			<InvoiceForm existingInvoice={invoice} onSubmit={onSubmit} />
		</Layout>
	);
};

export default EditInvoice;
