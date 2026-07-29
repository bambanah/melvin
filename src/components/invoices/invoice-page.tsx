import InvoiceActivities from "@/components/invoices/invoice-activities";
import InvoiceDocument from "@/components/invoices/invoice-document";
import InvoiceVersionHistory from "@/components/invoices/invoice-version-history";
import { useInvalidateInvoice } from "@/components/invoices/use-invoice-actions";
import { Fact, FactGrid } from "@/components/shared/fact";
import { useRateContext } from "@/components/shared/use-rate-context";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Loading from "@/components/ui/loading";
import { InvoiceStatus } from "@/generated/browser";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { utcDate } from "@/lib/date-utils";
import { currentDisplayInvoiceNo } from "@/lib/invoice-utils";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
	DollarSign,
	Dumbbell,
	EllipsisVertical,
	Pencil,
	Plane,
	Trash2,
	Undo,
	User
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const InvoicePage = ({ invoiceId }: { invoiceId: string }) => {
	const router = useRouter();
	const rateContext = useRateContext();

	const trpcUtils = trpc.useUtils();
	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId
	});
	const sendMutation = trpc.invoice.send.useMutation();
	const amendMutation = trpc.invoice.amend.useMutation();
	const markPaidMutation = trpc.invoice.markPaid.useMutation();
	const unmarkPaidMutation = trpc.invoice.unmarkPaid.useMutation();
	const deleteMutation = trpc.invoice.delete.useMutation();
	const invalidateInvoice = useInvalidateInvoice(invoiceId);

	const sendInvoice = () => {
		sendMutation.mutateAsync({ ids: [invoiceId] }).then(invalidateInvoice);
	};

	const markAsPaid = () => {
		markPaidMutation.mutateAsync({ ids: [invoiceId] }).then(invalidateInvoice);
	};

	const markAsUnpaid = () => {
		unmarkPaidMutation
			.mutateAsync({ ids: [invoiceId] })
			.then(invalidateInvoice);
	};

	const amendInvoice = () => {
		if (!confirm("Amend this invoice? It will go back to draft.")) return;

		amendMutation.mutateAsync({ id: invoiceId }).then(invalidateInvoice);
	};

	const deleteInvoice = () => {
		if (!confirm("Delete this invoice? This can't be undone.")) return;

		deleteMutation
			.mutateAsync({ id: invoiceId })
			.then(() => {
				// Only the list - the detail query would refetch a gone invoice.
				trpcUtils.invoice.list.invalidate();
				toast.success("Invoice deleted");
				router.push("/dashboard/invoices");
			})
			.catch(() => {
				toast.error("An error occurred. Please refresh and try again.");
			});
	};

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoice) return <Loading />;

	const isDraft = invoice.status === InvoiceStatus.CREATED;
	const isSent = invoice.status === InvoiceStatus.SENT;
	const isPaid = invoice.status === InvoiceStatus.PAID;
	const hasVersions = (invoice.versions?.length ?? 0) > 0;

	const displayNo = currentDisplayInvoiceNo(invoice);

	// A draft's total tracks live rates; a locked invoice shows the latest
	// version's frozen total, not a recompute.
	const total = isDraft
		? getTotalCostOfActivities(invoice.activities, rateContext, {
				forDisplay: true
			})
		: (invoice.versions?.[0]?.total ?? 0);

	return (
		<div className="flex flex-col items-center px-4 pb-24 md:pb-8">
			<Head>
				<title>{`${displayNo} | Melvin`}</title>
			</Head>
			<div className="flex w-full max-w-3xl flex-col gap-6">
				<header className="mt-2 flex flex-col gap-5">
					<div className="flex items-start justify-between gap-3">
						<div className="flex min-w-0 flex-col gap-1">
							<p className="text-primary text-xs font-medium">
								{format(utcDate(invoice.date), "EEEE, d MMMM yyyy")}
							</p>
							<div className="flex items-center gap-2.5">
								<h1 className="text-lg font-semibold tracking-tight text-balance md:text-xl">
									{displayNo}
								</h1>
								<InvoiceStatusBadge invoiceStatus={invoice.status} />
							</div>
							<p className="text-foreground/50 font-mono text-xs">
								Bill to {invoice.billTo ?? invoice.client.name}
							</p>
						</div>

						<div className="flex shrink-0 items-center gap-1.5">
							{isDraft && (
								<Button
									size="sm"
									onClick={sendInvoice}
									disabled={invoice.activities.length === 0}
								>
									<Plane />
									Mark as Sent
								</Button>
							)}
							{isSent && (
								<Button size="sm" onClick={markAsPaid}>
									<DollarSign />
									Mark as Paid
								</Button>
							)}
							{isPaid && (
								<Button size="sm" onClick={amendInvoice}>
									<Undo />
									Amend
								</Button>
							)}

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										aria-label="Invoice actions"
									>
										<EllipsisVertical />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{isDraft && (
										<Link href={`/dashboard/invoices/${invoice.id}/edit`}>
											<DropdownMenuItem className="cursor-pointer">
												<Pencil className="mr-2 h-4 w-4" />
												<span>Edit</span>
											</DropdownMenuItem>
										</Link>
									)}
									{isSent && (
										<DropdownMenuItem
											onClick={amendInvoice}
											className="cursor-pointer"
										>
											<Undo className="mr-2 h-4 w-4" />
											<span>Amend</span>
										</DropdownMenuItem>
									)}
									{isPaid && (
										<DropdownMenuItem
											onClick={markAsUnpaid}
											className="cursor-pointer"
										>
											<Undo className="mr-2 h-4 w-4" />
											<span>Mark as unpaid</span>
										</DropdownMenuItem>
									)}
									{isDraft && !hasVersions && (
										<DropdownMenuItem
											onClick={deleteInvoice}
											className="text-destructive focus:text-destructive cursor-pointer"
										>
											<Trash2 className="mr-2 h-4 w-4" />
											<span>Delete</span>
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					<FactGrid>
						<Fact icon={DollarSign} label="Total">
							<span
								className="text-lg font-semibold tracking-tight tabular-nums"
								data-testid="invoice-total"
							>
								{formatCurrency(total)}
							</span>
						</Fact>

						<Fact icon={User} label="Client">
							<Link
								href={`/dashboard/clients/${invoice.client.id}`}
								className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4 transition-colors"
							>
								{invoice.client.name}
							</Link>
						</Fact>

						<Fact icon={Dumbbell} label="Activities">
							{invoice.activities.length}
						</Fact>
					</FactGrid>
				</header>

				<InvoiceDocument invoice={invoice} />
				<InvoiceVersionHistory invoice={invoice} />
				<InvoiceActivities invoice={invoice} />
			</div>
		</div>
	);
};

export default InvoicePage;
