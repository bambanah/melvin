import Layout from "@/components/shared/layout";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
const InvoicePage = dynamic(() => import("@/components/invoices/invoice-page"));

const Invoice = () => {
	const router = useRouter();
	const invoiceId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	return <Layout>{invoiceId && <InvoicePage invoiceId={invoiceId} />}</Layout>;
};

export default Invoice;
