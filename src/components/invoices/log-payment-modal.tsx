import Button from "@atoms/button";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog } from "@headlessui/react";
import { getTotalCostOfActivities } from "@utils/activity-utils";
import { debounce } from "@utils/generic-utils";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const LogPayment = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [amountPaid, setAmountPaid] = useState<number>(0);
	const [invoicesToUpdate, setInvoicesToUpdate] = useState<string[]>([]);

	const {
		data: { invoiceIds, invoiceDetails } = {},
		refetch: fetchMatchingInvoiceIds,
	} = trpc.invoice.matchByPayment.useQuery(
		{ paymentAmount: amountPaid ?? 0 },
		{ enabled: false }
	);
	const trpcContext = trpc.useContext();
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();

	const closeModal = () => {
		setAmountPaid(0);
		setInvoicesToUpdate([]);
		setIsOpen(false);
	};

	const updateAmountPaid = debounce(
		(value: number) => setAmountPaid(value),
		750
	);

	const updateMatchingInvoices = () => {
		// Mark matching invoices as paid
		markInvoiceAsMutation
			.mutateAsync({
				ids: invoicesToUpdate,
				status: "PAID",
			})
			.then(() => {
				trpcContext.invoice.list.invalidate();
				trpcContext.invoice.matchByPayment.invalidate();
				toast.success("Invoices updated");
				closeModal();
			});
	};

	useEffect(() => {
		// Check for invoices matching the total
		fetchMatchingInvoiceIds();
	}, [amountPaid, fetchMatchingInvoiceIds]);

	function InvoiceCard({ invoiceId }: { invoiceId: string }) {
		const invoice = invoiceDetails?.find((i) => i.id === invoiceId);

		if (!invoice) {
			return null;
		}

		const checked = invoicesToUpdate.includes(invoiceId);

		return (
			<label
				className={classNames([
					"flex cursor-pointer items-center gap-4 rounded-md border px-4 py-2 hover:border-indigo-500",
					checked ? "border-indigo-500 bg-indigo-100" : "bg-white",
				])}
				htmlFor={invoiceId}
			>
				<input
					id={invoiceId}
					type="checkbox"
					checked={checked}
					onChange={(val) => {
						if (val.target.checked) {
							setInvoicesToUpdate([...invoicesToUpdate, invoiceId]);
						} else {
							setInvoicesToUpdate(
								invoicesToUpdate.filter((id) => id !== invoiceId)
							);
						}
					}}
					className="w-5 cursor-pointer border bg-white outline-none ring-0"
				/>
				<div>
					<p className="font-semibold">{invoice.invoiceNo}</p>
					<p className="text-neutral-600">{invoice.client.name}</p>
				</div>
				<div className="ml-auto text-right">
					<p className="font-semibold">
						{getTotalCostOfActivities(invoice.activities).toLocaleString(
							undefined,
							{ style: "currency", currency: "AUD" }
						)}
					</p>
					<p className="text-neutral-600">
						{dayjs.utc(invoice.date).format("DD/MM/YY")}
					</p>
				</div>
			</label>
		);
	}

	function CombinationDisplay({ ids }: { ids: (string | string[])[] }) {
		return (
			<div className="flex flex-col gap-4 rounded-md">
				{ids.map((candidate, idx) => (
					<React.Fragment key={idx}>
						{Array.isArray(candidate) ? (
							<div className="flex flex-col gap-2" key={idx}>
								{candidate.map((invoiceId) => (
									<InvoiceCard invoiceId={invoiceId} key={invoiceId} />
								))}
							</div>
						) : (
							<InvoiceCard invoiceId={candidate} />
						)}

						{idx < ids.length - 1 && (
							<FontAwesomeIcon icon={faPlus} size="xl" key={`${idx}-icon`} />
						)}
					</React.Fragment>
				))}
			</div>
		);
	}

	return (
		<>
			<Button
				className="w-auto font-mono font-medium"
				onClick={() => setIsOpen(true)}
			>
				$ Payment
			</Button>
			<Dialog open={isOpen} onClose={() => closeModal()}>
				<div className="fixed inset-0 z-30 bg-black bg-opacity-25" />

				<div className="fixed inset-0 z-40 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Dialog.Panel className="flex w-full max-w-lg transform flex-col gap-8 overflow-hidden rounded-md bg-neutral-50 p-6 text-left align-middle shadow-xl transition-all">
							<div className="flex flex-col gap-4">
								<Dialog.Title as="h3" className="text-xl">
									How much were you paid?
								</Dialog.Title>

								<div
									className={classNames([
										"flex items-center overflow-hidden rounded-md border bg-white px-3 text-fg shadow-md focus-within:border-indigo-500",
									])}
								>
									<span className="font-light text-gray-500">$</span>
									<input
										type="number"
										step="0.01"
										className="w-full border-none py-3 pl-1 text-fg outline-none"
										onChange={(e) =>
											updateAmountPaid(Number.parseFloat(e.target.value) || 0)
										}
									/>
								</div>
							</div>

							{invoiceDetails &&
								amountPaid !== undefined &&
								amountPaid > 0 &&
								invoiceIds &&
								invoiceIds.length > 0 && (
									<>
										<hr />
										<div className="flex flex-col gap-2 divide-y">
											{invoiceIds.length > 1 && (
												<p>Found multiple candidates.</p>
											)}
											{invoiceIds.map((candidates, idx) => (
												<CombinationDisplay ids={candidates} key={idx} />
											))}
										</div>
									</>
								)}

							<div className="btn-group mt-0">
								<Button
									type="button"
									variant="primary"
									onClick={() => {
										updateMatchingInvoices();
										closeModal();
									}}
									disabled={invoicesToUpdate.length === 0}
								>
									Mark as Paid
								</Button>
								<Button type="button" onClick={() => closeModal()}>
									Cancel
								</Button>
							</div>
						</Dialog.Panel>
					</div>
				</div>
			</Dialog>
		</>
	);
};

export default LogPayment;
