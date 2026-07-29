import {
	useDownloadInvoicePdf,
	useInvalidateInvoice
} from "@/components/invoices/use-invoice-actions";
import { Button } from "@/components/ui/button";
import { utcDate } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceByIdOutput } from "@/server/api/routers/invoice-router";
import { format } from "date-fns";
import { Download, Trash2 } from "lucide-react";

/**
 * Every frozen version of the invoice, newest first, each downloadable as it
 * was sent. Only the latest version can be deleted - dropping an earlier one
 * would misalign every later version's suffix.
 */
function InvoiceVersionHistory({ invoice }: { invoice: InvoiceByIdOutput }) {
	const deleteVersionMutation = trpc.invoice.deleteVersion.useMutation();
	const invalidateInvoice = useInvalidateInvoice(invoice.id);
	const downloadPdf = useDownloadInvoicePdf(invoice.id);

	const versions = invoice.versions ?? [];
	if (versions.length === 0) return null;

	const deleteVersion = (versionNumber: number) => {
		const message =
			versions.length === 1
				? "Delete this version? The invoice will return to draft, as if it was never sent."
				: "Delete this version? It will be dropped and its number reused on the next send.";
		if (!confirm(message)) return;

		deleteVersionMutation
			.mutateAsync({ id: invoice.id, versionNumber })
			.then(invalidateInvoice);
	};

	return (
		<section className="bg-card overflow-hidden rounded-xl border">
			<div className="border-b px-5 py-3.5">
				<h2 className="text-sm font-semibold">Version history</h2>
			</div>

			<div className="divide-y px-5">
				{versions.map((version, index) => (
					<div
						key={version.versionNumber}
						className="flex items-center justify-between gap-4 py-3"
					>
						<div className="flex min-w-0 flex-col gap-0.5">
							<p className="text-sm font-medium">{version.displayInvoiceNo}</p>
							<p className="text-foreground/60 text-xs">
								Sent {format(utcDate(version.sentAt), "dd/MM/yyyy")}
								{version.paidAt &&
									` · Paid ${format(utcDate(version.paidAt), "dd/MM/yyyy")}`}
								{version.backfilled && " · Backfilled"}
							</p>
						</div>

						<div className="flex shrink-0 items-center gap-1">
							<p className="mr-2 text-sm font-semibold tabular-nums">
								{formatCurrency(version.total)}
							</p>
							<Button
								variant="ghost"
								size="icon"
								onClick={() =>
									downloadPdf(version.displayInvoiceNo, version.versionNumber)
								}
								aria-label={`Download ${version.displayInvoiceNo}`}
							>
								<Download className="h-4 w-4" />
							</Button>
							{index === 0 && (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => deleteVersion(version.versionNumber)}
									aria-label="Delete version"
								>
									<Trash2 className="text-destructive h-4 w-4" />
								</Button>
							)}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

export default InvoiceVersionHistory;
