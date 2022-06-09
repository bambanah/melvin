import Layout from "@layouts/common/layout";
import CreateInvoiceForm, { FormValues } from "@organisms/forms/invoice-form";
import { getNextInvoiceNo, invoiceToValues } from "@utils/helpers";
import { GetServerSideProps } from "next";
import React from "react";
import prisma from "@utils/prisma";

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
				activities: true,
			},
		});

		if (invoice) {
			const invoiceNumbers = await prisma.invoice.findMany({
				where: {
					ownerId: invoice.ownerId,
					clientId: invoice.clientId,
				},
				select: {
					invoiceNo: true,
				},
			});

			const initialValues = invoiceToValues(invoice);

			const originalInvoiceNo = initialValues.invoiceNo;
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
					copiedFrom: originalInvoiceNo,
				},
			};
		}
	}

	return {
		props: {},
	};
};

export default CreateInvoice;
