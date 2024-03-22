import LogPayment from "@/components/invoices/log-payment-modal";
import InfiniteList from "@/components/shared/infinite-list";
import ListFilterRow from "@/components/shared/list-filter-row";
import ListPage from "@/components/shared/list-page";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import { faDownload, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import Link from "next/link";
import { useState } from "react";
import {
	StatusFilter,
	statusFilterMap,
	statusFilters,
} from "./invoice-list.constants";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Plus } from "lucide-react";
dayjs.extend(utc);

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
			<ListPage.Header>
				<h2 className="mr-auto text-2xl font-bold">Invoices</h2>

				<LogPayment />

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
							className={classNames([
								"flex w-full justify-between gap-2 p-4 text-sm text-foreground",
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
										<FontAwesomeIcon icon={faDownload} size="sm" />
									</a>
									{invoice.client.invoiceEmail && (
										<a
											href={`mailto:${invoice.client.invoiceEmail}`}
											target="_blank"
										>
											<FontAwesomeIcon icon={faEnvelope} size="sm" />
										</a>
									)}
								</div>
								<span className="text-sm sm:text-base">
									{dayjs.utc(invoice.date).format("DD MMM.")}
								</span>
							</div>
							<div className="flex basis-10 flex-col gap-2 text-right">
								<span className="sm:text-lg">
									{getTotalCostOfActivities(invoice.activities).toLocaleString(
										undefined,
										{
											style: "currency",
											currency: "AUD",
										}
									)}
								</span>
								<InvoiceStatusBadge invoiceStatus={invoice.status} />
							</div>
						</div>
					))
				}
			</InfiniteList>
		</ListPage>
	);
}
