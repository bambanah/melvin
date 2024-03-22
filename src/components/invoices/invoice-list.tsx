import { InvoiceStatusBadge } from "@atoms/badge";
import Button from "@atoms/button";
import LogPayment from "@components/invoices/log-payment-modal";
import InfiniteList from "@components/shared/infinite-list";
import ListFilterRow from "@components/shared/list-filter-row";
import ListPage from "@components/shared/list-page";
import { faEnvelope, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getTotalCostOfActivities } from "@utils/activity-utils";
import { trpc } from "@utils/trpc";
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

				<Button
					as={Link}
					href={`/dashboard/invoices/create${
						clientId ? `?clientId=${clientId}` : ""
					}`}
					variant="primary"
				>
					<FontAwesomeIcon icon={faPlus} />
					<span>Add</span>
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
								"flex w-full justify-between gap-2 p-4 text-sm text-zinc-900",
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
									{invoice.client.invoiceEmail && (
										<a
											href={`mailto:${invoice.client.invoiceEmail}`}
											className="text-neutral-500"
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
