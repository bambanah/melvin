import Badge from "@atoms/badge";
import Heading from "@atoms/heading";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
			<div className="flex items-center justify-between px-4 py-2">
				<Heading className="">Invoices</Heading>

				<Link
					href={`/invoices/create`}
					className="fixed bottom-32 right-6 flex h-12 w-12 items-center justify-center rounded-md bg-indigo-700 text-2xl leading-none text-zinc-50 md:relative md:inset-0 md:h-10 md:w-28 md:gap-2 md:text-base hover:md:bg-indigo-600"
				>
					<FontAwesomeIcon icon={faPlus} />{" "}
					<span className="hidden md:inline"> Add New</span>
				</Link>
			</div>

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

			<div className="flex flex-col divide-y">
				{invoices.map((invoice, idx) => (
					<Link key={idx} href={`/invoices/${invoice.id}`}>
						<div className="flex justify-between py-4 px-4 text-sm text-zinc-900 hover:bg-zinc-100">
							<div className="flex flex-col gap-2">
								<span className="font-medium sm:text-lg">
									{invoice.invoiceNo}: {invoice.client.name}
								</span>
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
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
