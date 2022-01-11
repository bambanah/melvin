import Layout from "@layouts/common/Layout";
import CreateInvoiceForm from "@organisms/forms/CreateInvoiceForm/CreateInvoiceForm";
import { Client, SupportItem } from "@prisma/client";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Head from "next/head";
import React from "react";
import safeJsonStringify from "safe-json-stringify";

interface ClientProps {
	clients: (Client & {
		invoices: {
			invoiceNo: string;
			billTo: string;
		}[];
	})[];
	supportItems: SupportItem[];
}

const CreateClient = ({ clients, supportItems }: ClientProps) => {
	return (
		<Layout>
			<Head>
				<title>Invoices - Melvin</title>
			</Head>
			<CreateInvoiceForm clients={clients} supportItems={supportItems} />
		</Layout>
	);
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const session = await getSession(ctx);

	if (!session) {
		return {
			props: {},
			redirect: "/login",
		};
	}

	const clients = await prisma.client.findMany({
		where: {
			ownerId: session?.user.id,
		},
		include: {
			invoices: {
				select: {
					invoiceNo: true,
					billTo: true,
				},
			},
		},
	});

	const supportItems = await prisma.supportItem.findMany({
		where: {
			ownerId: session?.user.id,
		},
	});

	return {
		props: {
			clients: JSON.parse(safeJsonStringify(clients ?? {})),
			supportItems: JSON.parse(safeJsonStringify(supportItems ?? {})),
		},
	};
};

export default CreateClient;
