import EntityList, { EntityListItem } from "@molecules/entity-list";
import PdfDocument from "@molecules/pdf-document";
import { getTotalCost } from "@utils/helpers";
import axios from "axios";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import React from "react";
import { toast } from "react-toastify";
import useSWR, { useSWRConfig } from "swr";
import { Invoice } from "types/invoice";

const getInvoices = async () => {
	const response = await fetch("/api/invoices");
	return (await response.json()) as Invoice[];
};

const savePdf = (invoiceId: string) => {
	axios
		.get(`/api/invoices/generate-pdf?invoiceId=${invoiceId}`)
		.then((response) => {
			const pdf = Buffer.from(response.data, "base64");
			const blob = new Blob([pdf], { type: "application/pdf" });

			const matches = response.headers["content-disposition"].match(/"(.*?)"/);
			const fileName = matches ? matches[0] : "generated.pdf";

			saveAs(blob, fileName);
		})
		.catch((error) => {
			console.error(error);
			toast.error("An unknown error occured");
		});
};

export default function InvoiceList() {
	const { mutate } = useSWRConfig();
	const { data: invoices, error } = useSWR("/api/invoices", getInvoices);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoices) return <div>loading...</div>;

	const entities: EntityListItem[] = invoices.map((invoice) => ({
		id: invoice.id,
		ExpandedComponent: (index: number) => (
			<PdfDocument invoiceId={invoices[index].id} />
		),
		actions: [
			{
				value: "Edit",
				type: "link",
				icon: "edit",
				href: `/invoices/${invoice.id}?edit=true`,
			},
			{
				value: "Copy",
				type: "link",
				icon: "copy",
				href: `/invoices/create?copyFrom=${invoice.id}`,
			},
			{
				value: "Download",
				type: "button",
				icon: "download",
				onClick: () => savePdf(invoice.id),
			},
			{
				value: "Delete",
				type: "button",
				icon: "trash",
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
				value: dayjs(invoice.date).format("DD/MM/YY"),
				type: "text",
				flex: "0 0 4.5em",
			},
			{
				value: invoice.invoiceNo,
				type: "label",
				flex: "1 0 5em",
			},
			{
				value: invoice.client?.name || "",
				icon: "user",
				type: "text",
				align: "left",
				flex: "1 1 100%",
			},
			{
				value: invoice.activities.length.toString(),
				icon: "walking",
				type: "text",
				flex: "0 0 2em",
			},
			{
				value: getTotalCost(invoice.activities).toLocaleString(undefined, {
					minimumFractionDigits: 2,
				}),
				icon: "dollar-sign",
				type: "text",
				flex: "0 0 5em",
			},
		],
	}));

	return (
		<EntityList
			title="Invoices"
			route="/invoices"
			entities={entities}
			shouldExpand
		/>
	);
}
