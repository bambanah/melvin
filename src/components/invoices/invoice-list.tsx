import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import ListFilterRow from "@/components/shared/list-filter-row";
import ListPage from "@/components/shared/list-page";
import { Button } from "@/components/ui/button";
import DataTable, { SortingHeader } from "@/components/ui/data-table";
import DatePicker from "@/components/ui/date-picker";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Tooltip from "@/components/ui/tooltip";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import { InvoiceListOutput } from "@/server/api/routers/invoice-router";
import { InvoiceStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Copy, Download, MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { InvoiceStatusBadge } from "../ui/badge";
import {
	StatusFilter,
	statusFilterMap,
	statusFilters
} from "./invoice-list.constants";
import LogPaymentDialog from "./log-payment-dialog";
dayjs.extend(require("dayjs/plugin/utc"));

interface Props {
	clientId?: string;
	groupByAssignedStatus?: boolean;
}

export default function InvoiceList({ clientId }: Props) {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [from, setFrom] = useState<Date | undefined>(undefined);
	const [to, setTo] = useState<Date | undefined>(undefined);

	const { data: invoices } = trpc.invoice.list.useQuery({
		clientId,
		status: statusFilterMap[statusFilter],
		from,
		to
	});

	const trpcUtils = trpc.useUtils();
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();

	const markInvoiceAs = (invoiceId: string, invoiceStatus: InvoiceStatus) => {
		if (invoiceId)
			markInvoiceAsMutation
				.mutateAsync({ ids: [invoiceId], status: invoiceStatus })
				.then(() => {
					trpcUtils.invoice.byId.invalidate({ id: invoiceId });
					trpcUtils.invoice.list.invalidate();
				});
	};

	const columns: ColumnDef<InvoiceListOutput>[] = [
		{
			id: "date",
			header: ({ column }) => (
				<SortingHeader column={column}>Date</SortingHeader>
			),
			cell: ({ row }) => <>{dayjs.utc(row.original.date).format("DD/MM/YY")}</>
		},
		{
			accessorKey: "invoiceNo",
			header: ({ column }) => (
				<SortingHeader column={column}>Invoice #</SortingHeader>
			),
			cell: ({ row }) => (
				<Link href={`/dashboard/invoices/${row.original.id}`}>
					{row.getValue("invoiceNo")}
				</Link>
			)
		},
		{
			id: "client-name",
			accessorFn: (invoice) => invoice.client.name,
			header: ({ column }) => (
				<SortingHeader column={column}>Client</SortingHeader>
			),
			cell: ({ row }) => (
				<Link href={`/dashboard/clients/${row.original.client.id}`}>
					{row.original.client.name}
				</Link>
			)
		},
		{
			id: "total-cost",
			accessorFn: (invoice) => {
				const totalCost = getTotalCostOfActivities(invoice.activities);

				return totalCost > 0
					? totalCost.toLocaleString(undefined, {
							style: "currency",
							currency: "AUD"
						})
					: "N/A";
			},
			header: ({ column }) => (
				<SortingHeader column={column}>Total</SortingHeader>
			)
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<SortingHeader column={column}>Status</SortingHeader>
			),
			cell: ({ row }) => (
				<DropdownMenu>
					<DropdownMenuTrigger>
						<InvoiceStatusBadge
							invoiceStatus={row.original.status}
							className="cursor-pointer"
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						{[InvoiceStatus.CREATED, InvoiceStatus.SENT, InvoiceStatus.PAID]
							.filter((status) => status !== row.original.status)
							.map((status) => (
								<DropdownMenuItem
									key={status}
									onClick={() => markInvoiceAs(row.original.id, status)}
									className="cursor-pointer"
								>
									<InvoiceStatusBadge invoiceStatus={status} />
								</DropdownMenuItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>
			)
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const invoice = row.original;

				return (
					<div className="flex items-center">
						<Tooltip title="Download PDF">
							<a
								href={`/api/invoices/generate-pdf/${invoice.id}`}
								target="_blank"
								download
							>
								<Button variant="ghost" size="icon">
									<Download className="h-4 w-4" />
								</Button>
							</a>
						</Tooltip>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" data-testid="more-actions">
									<MoreHorizontal />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<Link href={`/dashboard/invoices/${invoice.id}/edit`}>
									<DropdownMenuItem className="cursor-pointer">
										<Pencil className="mr-2 h-4 w-4" />
										<span>Edit</span>
									</DropdownMenuItem>
								</Link>
								{invoice.client.invoiceEmail && (
									<DropdownMenuItem
										className="cursor-pointer"
										onClick={() => {
											if (invoice.client.invoiceEmail)
												navigator.clipboard.writeText(
													invoice.client.invoiceEmail
												);
										}}
									>
										<Copy className="mr-2 h-4 w-4" />
										<span>Copy Email</span>
									</DropdownMenuItem>
								)}

								<DeleteEntityButton
									entityId={invoice.id}
									entityType={"invoice"}
								/>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			}
		}
	];

	return (
		<ListPage>
			<ListPage.Header
				title="Invoices"
				createNewHref="/dashboard/invoices/create"
				extraButtons={<LogPaymentDialog />}
			/>

			<div className="mb-4">
				<h3 className="mb-2 font-medium">Status</h3>
				<ListFilterRow
					items={statusFilters.map((filter) => ({
						children: filter,
						active: statusFilter === filter,
						onClick: () => setStatusFilter(filter)
					}))}
				/>
			</div>

			<div className="mb-4">
				<h3 className="mb-2 font-medium">Financial Year</h3>
				<div className="flex items-center gap-4">
					<DatePicker date={from} setDate={setFrom} />

					<DatePicker date={to} setDate={setTo} />
				</div>
			</div>

			{invoices?.totalAmount !== undefined && (
				<div className="mb-4 rounded-md bg-slate-100 p-4 dark:bg-slate-800">
					<h3 className="font-medium">Total Amount</h3>
					<p className="text-2xl font-bold text-orange-700">
						{invoices.totalAmount.toLocaleString(undefined, {
							style: "currency",
							currency: "AUD"
						})}
					</p>
				</div>
			)}

			{invoices && <DataTable columns={columns} data={invoices.invoices} />}
		</ListPage>
	);
}
