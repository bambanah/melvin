import { downloadOrSharePdf } from "@/lib/download-pdf";
import { trpc } from "@/lib/trpc";

/**
 * Invalidates the queries an invoice mutation goes stale against: the
 * invoice's own detail query and the list. Resolves once active refetches
 * have landed.
 */
export function useInvalidateInvoice(invoiceId: string) {
	const trpcUtils = trpc.useUtils();

	return async () => {
		await Promise.all([
			trpcUtils.invoice.byId.invalidate({ id: invoiceId }),
			trpcUtils.invoice.list.invalidate()
		]);
	};
}

/**
 * Downloads (or shares) the invoice's PDF as `<fileName>.pdf` - the frozen
 * version when a `versionNumber` is given, otherwise whatever the server
 * resolves for the invoice.
 */
export function useDownloadInvoicePdf(invoiceId: string) {
	const trpcUtils = trpc.useUtils();

	return async (fileName: string, versionNumber?: number) => {
		const dataUrl = await trpcUtils.pdf.forInvoice.fetch({
			invoiceId,
			returnBase64: true,
			versionNumber
		});

		await downloadOrSharePdf(dataUrl, `${fileName}.pdf`);
	};
}
