import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { debounce } from "@/lib/generic-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { Plus, Wallet } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { toast } from "react-toastify";

const LogPaymentDialog = () => {
	const [amountPaid, setAmountPaid] = useState(0);
	const [invoicesToUpdate, setInvoicesToUpdate] = useState<string[]>([]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			// Use timeout to prevent layout shifts when clearing before closing animation complete
			setTimeout(() => {
				setAmountPaid(0);
				setInvoicesToUpdate([]);
			}, 100);
		}
	};

	const {
		data: { invoiceIds, invoiceDetails } = {},
		refetch: fetchMatchingInvoiceIds,
		isLoading
	} = trpc.invoice.matchByPayment.useQuery(
		{ paymentAmount: amountPaid ?? 0 },
		{ enabled: false }
	);
	const trpcUtils = trpc.useUtils();
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();

	useEffect(() => {
		setInvoicesToUpdate([]);
	}, [invoiceIds]);

	const updateAmountPaid = debounce(
		(value: number) => setAmountPaid(value),
		750
	);

	const updateMatchingInvoices = () => {
		// Mark matching invoices as paid
		markInvoiceAsMutation
			.mutateAsync({
				ids: invoicesToUpdate,
				status: "PAID"
			})
			.then(() => {
				trpcUtils.invoice.list.invalidate();
				trpcUtils.invoice.matchByPayment.invalidate();
				toast.success("Invoices updated");
			});
	};

	useEffect(() => {
		// Check for invoices matching the total
		if (amountPaid > 0) fetchMatchingInvoiceIds();
	}, [amountPaid, fetchMatchingInvoiceIds]);

	function InvoiceCard({ invoiceId }: { invoiceId: string }) {
		const invoice = invoiceDetails?.find((i) => i.id === invoiceId);

		if (!invoice) {
			return null;
		}

		const checked = invoicesToUpdate.includes(invoiceId);

		return (
			<label
				className={cn([
					"flex cursor-pointer items-center gap-4 rounded-md border px-4 py-2 hover:border-primary/50",
					checked ? "border-primary/20 bg-primary/10" : "bg-background"
				])}
				htmlFor={invoiceId}
			>
				<Checkbox
					id={invoiceId}
					checked={checked}
					onCheckedChange={(checked) => {
						if (checked) {
							setInvoicesToUpdate([...invoicesToUpdate, invoiceId]);
						} else {
							setInvoicesToUpdate(
								invoicesToUpdate.filter((id) => id !== invoiceId)
							);
						}
					}}
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
					<Fragment key={idx}>
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
							<Plus className="mx-auto h-8 w-8" key={`${idx}-icon`} />
						)}
					</Fragment>
				))}
			</div>
		);
	}

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<Wallet className="h-4 w-4" />
					<span className="hidden sm:inline">Log Payment</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>How much were you paid?</DialogTitle>
				</DialogHeader>

				<Input
					id="name"
					type="number"
					step={0.01}
					placeholder="Payment Amount"
					onChange={(e) =>
						updateAmountPaid(Number.parseFloat(e.target.value) || 0)
					}
				/>

				{amountPaid > 0 &&
					!isLoading &&
					(!!invoiceIds?.length ? (
						<div className="flex flex-col gap-2 divide-y">
							{invoiceIds.length > 1 && <p>Found multiple candidates.</p>}
							{invoiceIds.map((candidates, idx) => (
								<CombinationDisplay ids={candidates} key={idx} />
							))}
						</div>
					) : (
						<p>No matching invoices found.</p>
					))}

				<DialogFooter>
					<DialogClose asChild>
						<Button
							type="submit"
							onClick={() => updateMatchingInvoices()}
							disabled={invoicesToUpdate.length === 0}
						>
							Mark as Paid
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default LogPaymentDialog;
