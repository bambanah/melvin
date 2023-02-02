import Layout from "@layouts/common/layout";
import CreateInvoiceForm, { FormValues } from "@organisms/forms/invoice-form";

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
