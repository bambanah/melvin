import {
	faCopy,
	faDollarSign,
	faDownload,
	faEdit,
	faTrash,
	faUser,
	faWalking,
} from "@fortawesome/free-solid-svg-icons";
import EntityList, { EntityListItem } from "@molecules/entity-list";
import PdfDocument from "@molecules/pdf-document";
import { getTotalCost } from "@utils/helpers";
import axios from "axios";
import dayjs from "dayjs";
import React from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import useSWR, { useSWRConfig } from "swr";
import Invoice from "types/invoice";

const getInvoices = async () => {
	const response = await fetch("/api/invoices");
	return (await response.json()) as Invoice[];
};

export default function InvoiceList() {
	const { mutate } = useSWRConfig();
	const { data: invoices, error } = useSWR("/api/invoices", getInvoices);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	const generateEntity = (invoice?: Invoice): EntityListItem => ({
		id: invoice?.id ?? "",
		ExpandedComponent: !invoices
			? undefined
			: (index: number) => <PdfDocument invoiceId={invoices[index].id} />,
		actions: !invoice
			? []
			: [
					{
						value: "Download",
						type: "link",
						icon: faDownload,
						href: `/api/invoices/generate-pdf?invoiceId=${invoice.id}`,
					},
					{
						value: "Edit",
						type: "link",
						icon: faEdit,
						href: `/invoices/${invoice.id}?edit=true`,
					},
					{
						value: "Copy",
						type: "link",
						icon: faCopy,
						href: `/invoices/create?copyFrom=${invoice.id}`,
					},
					{
						value: "Delete",
						type: "button",
						icon: faTrash,
						onClick: () => {
							if (
								confirm(`Are you sure you want to delete ${invoice.invoiceNo}?`)
							) {
								axios
									.delete(`/api/invoices/${invoice.id}`)
									.then((response) => {
										mutate("/api/invoices");
										toast.success(response);
									})
									.catch((error_) => toast.error(error_));
							}
						},
					},
			  ],
		fields: [
			{
				value: !invoice ? <Skeleton /> : dayjs(invoice.date).format("DD/MM/YY"),
				type: "text",
				flex: "0 0 4.5em",
			},
			{
				value: !invoice ? <Skeleton /> : invoice.invoiceNo,
				type: "label",
				flex: "1 0 5em",
			},
			{
				value: !invoice ? <Skeleton /> : invoice.client?.name || "",
				icon: faUser,
				type: "text",
				align: "left",
				flex: "1 1 100%",
			},
			{
				value: !invoice ? <Skeleton /> : invoice.activities.length.toString(),
				icon: faWalking,
				type: "text",
				flex: "0 0 2em",
			},
			{
				value: !invoice ? (
					<Skeleton />
				) : (
					getTotalCost(invoice.activities).toLocaleString(undefined, {
						minimumFractionDigits: 2,
					})
				),
				icon: faDollarSign,
				type: "text",
				flex: "0 0 5em",
			},
		],
	});

	if (!invoices)
		return (
			<EntityList
				title="Invoices"
				entities={
					Array.from({ length: 1 }).fill(generateEntity()) as EntityListItem[]
				}
			/>
		);

	return (
		<EntityList
			title="Invoices"
			route="/invoices"
			entities={invoices.map((invoice) => generateEntity(invoice))}
			shouldExpand
		/>
	);
}
