import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import InfiniteList from "@/components/shared/infinite-list";
import ListFilterRow from "@/components/shared/list-filter-row";
import ListPage from "@/components/shared/list-page";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Download, EllipsisVertical, Mail, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
	StatusFilter,
	statusFilterMap,
	statusFilters,
} from "./invoice-list.constants";

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

	const queryResult = trpc.invoice.list.useInfiniteQuery(
		{
			status: statusFilterMap[statusFilter],
			clientId,
		},
		{ getNextPageParam: (lastPage) => lastPage.nextCursor }
	);

	return (
		<ListPage>
			<ListPage.Header
				title="Invoices"
				createNewHref="/dashboard/invoices/create"
			/>

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
							data-testid="invoice-list-item"
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
									<Link href={`/dashboard/invoices/${invoice.id}/edit`}>
										<DropdownMenuItem className="cursor-pointer">
											<Pencil className="mr-2 h-4 w-4" />
											<span>Edit</span>
										</DropdownMenuItem>
									</Link>

									<DeleteEntityButton
										entityId={invoice.id}
										entityType={"invoice"}
									/>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					))
				}
			</InfiniteList>
		</ListPage>
	);
}
