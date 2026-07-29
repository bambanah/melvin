import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	useDownloadInvoicePdf,
	useInvalidateInvoice
} from "@/components/invoices/use-invoice-actions";
import { InvoiceStatus } from "@/generated/browser";
import { currentDisplayInvoiceNo } from "@/lib/invoice-utils";
import { trpc } from "@/lib/trpc";
import type { InvoiceByIdOutput } from "@/server/api/routers/invoice-router";
import { ChevronDown, Download, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

const PdfPreview = dynamic(() => import("@/components/invoices/pdf-preview"), {
	ssr: false
});

/**
 * The invoice's rendered PDF: a thumbnail that expands into a full preview,
 * plus the download actions. A draft with activities gets the Download split
 * (draft copy vs send & download); everything else downloads what the server
 * resolves for the invoice - the DRAFT watermark for drafts, the frozen
 * latest version once sent.
 */
function InvoiceDocument({ invoice }: { invoice: InvoiceByIdOutput }) {
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	const sendMutation = trpc.invoice.send.useMutation();
	const invalidateInvoice = useInvalidateInvoice(invoice.id);
	const downloadPdf = useDownloadInvoicePdf(invoice.id);

	const isDraft = invoice.status === InvoiceStatus.CREATED;
	const hasActivities = invoice.activities.length > 0;

	// A locked invoice's download is the frozen latest version, so name the
	// file after it; a draft renders under the bare invoice number.
	const currentFileName = isDraft
		? invoice.invoiceNo
		: currentDisplayInvoiceNo(invoice);

	const sendAndDownload = async () => {
		const { invoices } = await sendMutation.mutateAsync({ ids: [invoice.id] });

		// Let the refetch land before the (slow) PDF fetch starts - issued in
		// the same tick they'd share an HTTP batch, and the page would sit on
		// stale draft actions until the PDF render finished.
		await invalidateInvoice();

		await downloadPdf(currentDisplayInvoiceNo(invoices[0] ?? invoice));
	};

	return (
		<section className="bg-card overflow-hidden rounded-xl border">
			<div className="flex items-center justify-between gap-2 border-b px-5 py-3.5">
				<h2 className="text-sm font-semibold">Document</h2>

				{isDraft && hasActivities ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<Download />
								Download
								<ChevronDown />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={() => downloadPdf(currentFileName)}
							>
								Download draft
							</DropdownMenuItem>
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={sendAndDownload}
							>
								Send & download
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<Button
						variant="outline"
						size="sm"
						onClick={() => downloadPdf(currentFileName)}
					>
						<Download />
						Download
					</Button>
				)}
			</div>

			{hasActivities ? (
				<div className="group bg-foreground/10 relative h-48 cursor-pointer overflow-hidden shadow-inner">
					<div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
						<div className="w-full">
							<PdfPreview invoiceId={invoice.id} />
						</div>
					</div>
					<div
						className="absolute inset-0 flex items-center justify-center"
						onClick={() => setIsPreviewOpen(true)}
						data-testid="pdf-preview-trigger"
					>
						<div className="flex items-center justify-center gap-2 rounded-md bg-zinc-900/80 px-3 py-2 text-zinc-50 transition-transform group-hover:scale-110 group-hover:bg-zinc-900">
							<Search className="h-4 w-4" />
							Preview
						</div>
					</div>
				</div>
			) : (
				<div className="bg-foreground/10 flex h-48 items-center justify-center">
					<p className="text-foreground/50 text-4xl">DRAFT</p>
				</div>
			)}

			<Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
				<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
					<DialogTitle className="sr-only">Invoice preview</DialogTitle>
					<PdfPreview invoiceId={invoice.id} />
				</DialogContent>
			</Dialog>
		</section>
	);
}

export default InvoiceDocument;
