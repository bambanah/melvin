import InfiniteList from "@/components/shared/infinite-list";
import ListFilterRow from "@/components/shared/list-filter-row";
import ListPage from "@/components/shared/list-page";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
	Download,
	EllipsisVertical,
	Mail,
	Pencil,
	Plus,
	Trash,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
	StatusFilter,
	statusFilterMap,
	statusFilters,
} from "./invoice-list.constants";
import LogPaymentDialog from "./log-payment-dialog";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/utc"));

interface Props {
	clientId?: string;
	groupByAssignedStatus?: boolean;
}

export default function InvoiceList({
	clientId,
	groupByAssignedStatus = true,
}: Props) {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

	const trpcUtils = trpc.useUtils();

	const queryResult = trpc.invoice.list.useInfiniteQuery(
		{
			status: statusFilterMap[statusFilter],
			clientId,
		},
		{ getNextPageParam: (lastPage) => lastPage.nextCursor }
	);

	const deleteInvoiceMutation = trpc.invoice.delete.useMutation();

	const deleteInvoice = (invoiceId: string) => {
		if (confirm("Are you sure?")) {
			deleteInvoiceMutation
				.mutateAsync({ id: invoiceId })
				.then(() => {
					trpcUtils.invoice.list.invalidate();

					toast.success("Invoice deleted");
				})
				.catch(() => {
					toast.error("An error occured. Please refresh and try again.");
				});
		}
	};

	return (
		<ListPage>
			<ListPage.Header>
				<h2 className="mr-auto text-2xl font-bold">Invoices</h2>

				<LogPaymentDialog />

				<Button asChild variant="inverted">
					<Link
						href={`/dashboard/invoices/create${
							clientId ? `?clientId=${clientId}` : ""
						}`}
					>
						<Plus className="mr-2 h-4 w-4" />
						Add
					</Link>
				</Button>
			</ListPage.Header>

			{groupByAssignedStatus && (
				<ListFilterRow
					items={statusFilters.map((status) => ({
						onClick: () => setStatusFilter(status),
						children: status,
						active: statusFilter === status,
					}))}
				/>
			)}

			<InfiniteList queryResult={queryResult} dataKey="invoices">
				{(invoices) =>
					invoices.map((invoice) => (
						<div
							key={invoice.id}
							className={cn([
								"flex w-full items-center gap-2 p-4 text-sm text-foreground",
							])}
						>
							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-4 font-medium sm:text-lg">
									<Link
										href={`/dashboard/invoices/${invoice.id}`}
										className="font-semibold"
									>
										{invoice.invoiceNo}: {invoice.client.name}
									</Link>
									<a
										href={`/api/invoices/generate-pdf/${invoice.id}`}
										target="_blank"
									>
										<Download className="h-4 w-4" />
									</a>
									{invoice.client.invoiceEmail && (
										<a
											href={`mailto:${invoice.client.invoiceEmail}`}
											target="_blank"
										>
											<Mail className="h-4 w-4" />
										</a>
									)}
								</div>
								<span className="text-sm sm:text-base">
									{dayjs.utc(invoice.date).format("DD MMM.")}
								</span>
							</div>
							<div className="ml-auto flex basis-10 flex-col items-end gap-2">
								<span className="sm:text-lg">
									{getTotalCostOfActivities(invoice.activities).toLocaleString(
										undefined,
										{
											style: "currency",
											currency: "AUD",
										}
									)}
								</span>
								<InvoiceStatusBadge
									invoiceStatus={invoice.status}
									className="-mr-1"
								/>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild className="grow-0 ">
									<Button variant="ghost" size="icon">
										<EllipsisVertical />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<Link href={`/invoices/${invoice.id}/edit`}>
										<DropdownMenuItem className="cursor-pointer">
											<Pencil className="mr-2 h-4 w-4" />
											<span>Edit</span>
										</DropdownMenuItem>
									</Link>

									<DropdownMenuItem
										onClick={() => deleteInvoice(invoice.id)}
										className="cursor-pointer"
									>
										<Trash className="mr-2 h-4 w-4" />
										<span>Delete</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					))
				}
			</InfiniteList>
		</ListPage>
	);
}
