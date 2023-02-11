import Badge from "@atoms/badge";
import EntityList, { EntityListItem } from "@components/shared/entity-list";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import {
	faCopy,
	faDollarSign,
	faDownload,
	faEdit,
	faEnvelope,
	faTrash,
	faUser,
	faWalking,
} from "@fortawesome/free-solid-svg-icons";
import { InvoiceStatus } from "@prisma/client";
import { InvoiceFetchAllOutput } from "@server/routers/invoice-router";
import { getTotalCost } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import dayjs from "dayjs";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import PdfDocument from "./pdf-document";

const getBadgeColorFromStatus = (status: InvoiceStatus) => {
	if (status === "PAID") {
		return "success";
	} else if (status === "SENT") {
		return "warning";
	}

	return "info";
};

export default function InvoiceList() {
	const { data: { invoices } = {}, error } = trpc.invoice.list.useQuery({});

	const utils = trpc.useContext();
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();
	const deleteInvoice = trpc.invoice.delete.useMutation();

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	const markInvoiceAs = (id: string, status: InvoiceStatus) => {
		markInvoiceAsMutation.mutateAsync({ id, status }).then(() => {
			utils.invoice.list.invalidate();
			utils.invoice.byId.invalidate({ id });
		});
	};

	const getInvoiceStatusActions = (invoice: InvoiceFetchAllOutput) => {
		const statusActions = [];

		if (invoice.status !== InvoiceStatus.SENT) {
			statusActions.push({
				value: "Mark as Sent",
				type: "button" as const,
				icon: faEnvelope,
				onClick: () => {
					markInvoiceAs(invoice.id, InvoiceStatus.SENT);
				},
			});
		}
		if (invoice.status !== InvoiceStatus.PAID) {
			statusActions.push({
				value: "Mark as Paid",
				type: "button" as const,
				icon: faDollarSign,
				onClick: () => {
					markInvoiceAs(invoice.id, InvoiceStatus.PAID);
				},
			});
		}
		if (invoice.status !== InvoiceStatus.CREATED) {
			statusActions.push({
				value: "Mark as Created",
				type: "button" as const,
				icon: faFile,
				onClick: () => {
					markInvoiceAs(invoice.id, InvoiceStatus.CREATED);
				},
			});
		}

		return statusActions;
	};

	const generateEntity = (invoice?: InvoiceFetchAllOutput): EntityListItem => ({
		id: invoice?.id ?? "",
		ExpandedComponent: invoices
			? (index: number) => <PdfDocument invoiceId={invoices[index].id} />
			: undefined,
		fields: [
			{
				value: invoice ? dayjs(invoice.date).format("DD/MM/YY") : <Skeleton />,
				type: "text",
				flex: "0 0 4.5em",
			},
			{
				type: "text",
				value: invoice ? (
					<Badge variant={getBadgeColorFromStatus(invoice.status)}>
						{invoice.status}
					</Badge>
				) : (
					<Skeleton />
				),
			},
			{
				value: invoice ? invoice.invoiceNo : <Skeleton />,
				type: "label",
				flex: "1 0 7em",
			},
			{
				value: invoice ? invoice.client?.name || "" : <Skeleton />,
				icon: faUser,
				type: "text",
				align: "left",
				flex: "1 1 100%",
			},
			{
				value: invoice ? invoice._count.activities.toString() : <Skeleton />,
				icon: faWalking,
				type: "text",
				flex: "0 0 2em",
			},
			{
				value: invoice ? (
					getTotalCost(invoice.activities).toLocaleString(undefined, {
						minimumFractionDigits: 2,
					})
				) : (
					<Skeleton />
				),
				icon: faDollarSign,
				type: "text",
				flex: "0 0 5.4em",
			},
		],
		actions: invoice
			? [
					{
						value: "Download",
						type: "link",
						icon: faDownload,
						href: `/api/invoices/generate-pdf/${invoice.id}`,
					},
					...getInvoiceStatusActions(invoice),
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
								deleteInvoice
									.mutateAsync({ id: invoice.id })
									.then(() => {
										utils.invoice.invalidate();

										toast.success("Invoice deleted");
									})
									.catch((error) => toast.error(error));
							}
						},
					},
			  ]
			: [],
	});

	return (
		<EntityList
			title="Invoices"
			route="/invoices"
			shouldExpand={!!invoices}
			entities={
				invoices
					? invoices.map((invoice) => generateEntity(invoice))
					: [generateEntity()]
			}
		/>
	);
}
