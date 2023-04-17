import Layout from "@components/shared/layout";
import CreateInvoiceForm, {
	FormValues,
} from "@components/invoices/invoice-form";
import prisma from "@server/prisma";
import { GetServerSideProps } from "next";
import { invoiceToValues } from "@utils/formik-utils";
import { getNextInvoiceNo } from "@utils/invoice-utils";

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

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
	const invoiceId = query.copyFrom;

	if (invoiceId) {
		const invoice = await prisma.invoice.findUnique({
			where: {
				id: String(invoiceId),
			},
			include: {
				activities: {
					include: {
						supportItem: true,
					},
				},
				client: true,
			},
		});

		if (invoice) {
			const invoiceNumbers = await prisma.invoice.findMany({
				where: {
					ownerId: invoice.ownerId,
				},
				select: {
					invoiceNo: true,
				},
			});

			const initialValues = invoiceToValues(invoice);

			initialValues.invoiceNo = getNextInvoiceNo(
				invoiceNumbers.map((i) => i.invoiceNo)
			);

			initialValues.activities = initialValues.activities.map((activity) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { id, date, ...rest } = activity;

				return rest;
			});

			delete initialValues.id;
			delete initialValues.date;

			return {
				props: {
					initialValues,
				},
			};
		}
	}

	return {
		props: {},
	};
};

export default CreateInvoice;
