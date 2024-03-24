import CreateInvoiceForm from "@/components/invoices/invoice-form";
import Layout from "@/components/shared/layout";
import { InvoiceSchema } from "@/schema/invoice-schema";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const CreateInvoice = () => {
	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const createInvoiceMutation = trpc.invoice.create.useMutation();

	function onSubmit(invoiceData: InvoiceSchema) {
		createInvoiceMutation.mutateAsync({ invoice: invoiceData }).then(() => {
			trpcUtils.invoice.list.invalidate();

			toast.success("Invoice created");
			router.back();
		});
	}

	return (
		<Layout>
			<CreateInvoiceForm onSubmit={onSubmit} />
		</Layout>
	);
};

export default CreateInvoice;
