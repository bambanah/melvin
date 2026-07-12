/**
 * One-off backfill (docs/plans/017 Step 9): every SENT/PAID invoice sent
 * before this feature existed has no `InvoiceVersion` row. This builds a v1
 * from *current* live data for each of them, flagged `backfilled: true`.
 *
 * Idempotent — only touches invoices with zero versions, so re-running is a
 * no-op. Must run once, after the schema migration, before the
 * frozen-total money queries (docs/plans/017 Step 8) see production traffic:
 * those queries read `versions[0].total`, which is `0` for a SENT/PAID
 * invoice with no version yet.
 *
 * Run with: pnpm exec tsx prisma/scripts/backfill-invoice-versions.ts
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import prisma from "@/server/prisma";
import { InvoiceStatus } from "@/generated/client";
import { loadInvoiceForPdf } from "@/lib/pdf-generation";
import { buildInvoiceVersionContent } from "@/lib/invoice-version";

export interface BackfillResult {
	backfilled: number;
	skipped: number;
}

export async function backfillInvoiceVersions(): Promise<BackfillResult> {
	const invoices = await prisma.invoice.findMany({
		where: {
			status: { in: [InvoiceStatus.SENT, InvoiceStatus.PAID] },
			versions: { none: {} }
		},
		select: {
			id: true,
			ownerId: true,
			invoiceNo: true,
			sentAt: true,
			paidAt: true,
			date: true
		}
	});

	console.log(`Found ${invoices.length} SENT/PAID invoice(s) with no version.`);

	let backfilled = 0;
	let skipped = 0;

	for (const invoice of invoices) {
		try {
			const data = await loadInvoiceForPdf(invoice.id, invoice.ownerId);

			if (!data) {
				console.warn(
					`Skipping ${invoice.invoiceNo} (${invoice.id}) — could not load for PDF (missing client or activities).`
				);
				skipped += 1;
				continue;
			}

			const content = buildInvoiceVersionContent(data, {
				versionNumber: 1,
				backfilled: true
			});

			await prisma.invoiceVersion.create({
				data: {
					invoiceId: invoice.id,
					versionNumber: 1,
					sentAt: invoice.sentAt ?? invoice.date,
					paidAt: invoice.paidAt,
					total: content.total,
					content
				}
			});

			backfilled += 1;
			console.log(`Backfilled v1 for ${invoice.invoiceNo} (${invoice.id}).`);
		} catch (error) {
			// A single un-backfillable invoice (e.g. an activity whose end time
			// precedes its start time throws in `getDuration`) must not abort
			// the whole batch — log it and carry on so the rest still backfill.
			console.warn(
				`Skipping ${invoice.invoiceNo} (${invoice.id}) — failed to backfill: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			skipped += 1;
		}
	}

	console.log(`Done. Backfilled ${backfilled}, skipped ${skipped}.`);

	return { backfilled, skipped };
}

// Only auto-run when executed directly (`pnpm exec tsx
// prisma/scripts/backfill-invoice-versions.ts`) — not when imported by
// the integration test. `pathToFileURL` normalises the argv path so this
// matches on Windows (`file:///C:/…`) as well as POSIX.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	backfillInvoiceVersions()
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		})
		.finally(async () => {
			await prisma.$disconnect();
		});
}
