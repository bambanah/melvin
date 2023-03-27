import Badge from "@atoms/badge";
import Loading from "@atoms/loading";
import ListPage from "@components/shared/list-page";
import { InvoiceStatus } from "@prisma/client";
import { InvoiceFetchAllOutput } from "@server/routers/invoice-router";
import { getTotalCost } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import dayjs from "dayjs";
import { useState } from "react";

const getBadgeColorFromStatus = (status: InvoiceStatus) => {
	if (status === "PAID") {
		return "SUCCESS";
	} else if (status === "SENT") {
		return "WARNING";
	}

	return "DEFAULT";
};

interface Props {
	clientId?: string;
	groupByAssignedStatus?: boolean;
}

export default function InvoiceList({
	clientId,
	groupByAssignedStatus = true,
}: Props) {
	const [statusFilter, setStatusFilter] = useState<"UNPAID" | "PAID">("UNPAID");

	const { data: { invoices } = {}, error } = trpc.invoice.list.useQuery({
		status: groupByAssignedStatus
			? statusFilter === "UNPAID"
				? [InvoiceStatus.CREATED, InvoiceStatus.SENT]
				: [InvoiceStatus.PAID]
			: undefined,
		clientId,
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	const InvoiceListItems = ({
		invoices,
	}: {
		invoices?: InvoiceFetchAllOutput[];
	}) => {
		if (!invoices) {
			return <Loading />;
		}

		if (invoices.length > 0) {
			return (
				<ListPage.Items>
					{invoices.map((invoice) => (
						<ListPage.Item key={invoice.id} href={`/invoices/${invoice.id}`}>
							<div className="flex flex-col gap-2">
								<div className="font-medium sm:text-lg">
									<span className="font-semibold">{invoice.invoiceNo}</span>:{" "}
									{invoice.client.name}
								</div>
								<span className="text-sm sm:text-base">
									{dayjs(invoice.date).format("DD MMM.")}
								</span>
							</div>
							<div className="flex basis-10 flex-col gap-2 text-right">
								<span className="sm:text-lg">
									{getTotalCost(invoice.activities).toLocaleString(undefined, {
										style: "currency",
										currency: "AUD",
									})}
								</span>
								<Badge variant={getBadgeColorFromStatus(invoice.status)}>
									{invoice.status}
								</Badge>
							</div>
						</ListPage.Item>
					))}
				</ListPage.Items>
			);
		}

		return (
			<ListPage.Items>
				<div className="py-8 text-center text-neutral-600">
					There&#39;s nothing here...
				</div>
			</ListPage.Items>
		);
	};

	return (
		<ListPage
			title="Invoices"
			createHref={`/invoices/create${clientId ? `?clientId=${clientId}` : ""}`}
		>
			{groupByAssignedStatus && (
				<div className="flex w-full">
					{(["UNPAID", "PAID"] as const).map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => setStatusFilter(status)}
							className={classNames([
								"basis-1/2 border-b-[3px] px-4 py-2 text-center transition-all",
								statusFilter === status && "border-indigo-700 text-indigo-700",
							])}
						>
							{status}
						</button>
					))}
				</div>
			)}
			<InvoiceListItems invoices={invoices} />
		</ListPage>
	);
}
