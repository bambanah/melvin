import Badge from "@atoms/badge";
import Heading from "@atoms/heading";
import { InvoiceStatus } from "@prisma/client";
import { getTotalCost } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";

const getBadgeColorFromStatus = (status: InvoiceStatus) => {
	if (status === "PAID") {
		return "SUCCESS";
	} else if (status === "SENT") {
		return "WARNING";
	}

	return "DEFAULT";
};

export default function InvoiceList() {
	const [statusFilter, setStatusFilter] = useState<"UNPAID" | "PAID">("UNPAID");

	const { data: { invoices } = {}, error } = trpc.invoice.list.useQuery({
		status:
			statusFilter === "UNPAID"
				? [InvoiceStatus.CREATED, InvoiceStatus.SENT]
				: [InvoiceStatus.PAID],
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	if (!invoices) {
		return <div>Loading</div>;
	}

	return (
		<div className="flex flex-col gap-4">
			<Heading className="medium pl-4">Invoices</Heading>

			<div className="flex w-full">
				<button
					type="button"
					onClick={() => setStatusFilter("UNPAID")}
					className={classNames([
						"basis-1/2 border-b-[3px] px-4 py-2 text-center transition-all",
						statusFilter === "UNPAID" && "border-indigo-700 text-indigo-700",
					])}
				>
					UNPAID
				</button>
				<button
					type="button"
					onClick={() => setStatusFilter("PAID")}
					className={classNames([
						"basis-1/2 border-b-[3px] px-4 py-2 text-center transition-all",
						statusFilter === "PAID" && "border-indigo-700 text-indigo-700",
					])}
				>
					PAID
				</button>
			</div>

			<div className="flex flex-col divide-y">
				{invoices.map((invoice, idx) => (
					<Link key={idx} href={`/invoices/${invoice.id}`}>
						<div className="flex justify-between py-4 px-4 text-sm text-zinc-900">
							<div className="flex flex-col gap-2">
								<span className="font-medium">
									{invoice.invoiceNo}: {invoice.client.name}
								</span>
								<span className="text-sm">
									{dayjs(invoice.date).format("DD MMM.")}
								</span>
							</div>
							<div className="flex basis-10 flex-col gap-2 text-right">
								<span>
									{getTotalCost(invoice.activities).toLocaleString(undefined, {
										style: "currency",
										currency: "AUD",
									})}
								</span>
								<Badge variant={getBadgeColorFromStatus(invoice.status)}>
									{invoice.status}
								</Badge>
							</div>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
