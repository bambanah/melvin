import Layout from "@components/shared/layout";
import CreateInvoiceForm, {
	FormValues,
} from "@components/invoices/invoice-form";

interface Props {
	initialValues?: FormValues;
	copiedFrom?: string;
}

const CreateInvoice = ({ initialValues, copiedFrom }: Props) => {
	return (
		<Layout>
			<CreateInvoiceForm
				initialValues={initialValues}
				copiedFrom={copiedFrom}
			/>
		</Layout>
	);
};

export default CreateInvoice;
