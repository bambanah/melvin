import { buildBillingReport, type ReportInvoice } from "@/lib/billing-report";
import { invoiceVersionContentSchema } from "@/schema/invoice-version-schema";
import { authedProcedure, router } from "@/server/api/trpc";
import { z } from "zod";

export const reportRouter = router({
	/**
	 * Total Billed and its breakdowns for one Financial Year. Reads each Sent or
	 * Paid Invoice's *latest* frozen version only - versions are never summed
	 * across an Amendment - and leaves every figure to the pure aggregator.
	 */
	billing: authedProcedure
		.input(z.object({ financialYear: z.number().int().optional() }))
		.query(async ({ ctx, input }) => {
			const invoices = await ctx.owned.invoice.findMany({
				where: { status: { in: ["SENT", "PAID"] } },
				select: {
					date: true,
					client: { select: { id: true, name: true } },
					versions: {
						select: { content: true },
						orderBy: { versionNumber: "desc" },
						take: 1
					}
				}
			});

			const reportInvoices = invoices.flatMap<ReportInvoice>((invoice) => {
				const latest = invoice.versions[0];
				if (!latest) return [];

				return [
					{
						date: invoice.date,
						clientId: invoice.client.id,
						clientName: invoice.client.name,
						content: invoiceVersionContentSchema.parse(latest.content)
					}
				];
			});

			return buildBillingReport(reportInvoices, {
				today: new Date(),
				financialYear: input.financialYear
			});
		})
});
