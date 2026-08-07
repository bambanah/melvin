/**
 * One-off correction: `backfill-invoice-versions.ts` built v1 for every
 * historic invoice from *current* live rates, so FY25-26 invoices billed at
 * the pre-increase rates were frozen at today's prices instead. This restores
 * the rates each invoice was actually billed at.
 *
 * Scope is FY25-26 (from 2025-07-01) up to, but excluding, each client's first
 * invoice at the current rates - see `CUTOFF_INVOICE_NOS`. Earlier financial
 * years are deliberately left alone: their rates aren't known yet.
 *
 * Prices are substituted into the existing frozen document rather than rebuilt
 * via `buildInvoiceVersionContent`, so a rebuild can't fold in unrelated drift
 * in the live `Activity` rows since the backfill. Only `unitPrice`, the line
 * `total`, and the document total move; `detailsText` carries no rate, so the
 * printed Details column is unaffected.
 *
 * Idempotent - a line already at its old price recomputes to the same value.
 *
 * Dry run:  pnpm exec tsx prisma/scripts/correct-fy2526-legacy-rates.ts
 * Apply:    pnpm exec tsx prisma/scripts/correct-fy2526-legacy-rates.ts --apply
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import prisma from "@/server/prisma";
import { floorToCent, round } from "@/lib/generic-utils";
import {
	invoiceVersionContentSchema,
	type InvoiceVersionLine
} from "@/schema/invoice-version-schema";

const FY_START = new Date("2025-07-01T00:00:00.000Z");

/** Each client's first invoice at the current rates. Everything dated before
 * it (and on/after `FY_START`) is corrected; this invoice itself is not. */
const CUTOFF_INVOICE_NOS = [
	"Gawne2035", // Jeremy Gawne
	"Gawne1039", // Jacqueline Gawne
	"Julia-45", // Julia De Felicis
	"Maree-19" // Tate Maree
];

/**
 * Pre-increase rates for the Access Community, Social and Rec. Activities
 * support item, keyed by the NDIS code the frozen line carries. Group codes
 * hold the full per-session base rate; the per-participant share is derived
 * per line, matching `billableLines`.
 *
 * Codes absent here are left untouched - notably House or Yard Maintenance
 * (01_019_0120_1_1), whose rate did not change, and the travel non-labour
 * codes (04_799_…), already frozen at the correct $0.85/km.
 */
const OLD_BASE_RATES: Record<string, number> = {
	"04_104_0125_6_1": 55.47, // Access Community - Weekday Daytime
	"04_105_0125_6_1": 87.51, // Access Community - Saturday
	"04_106_0125_6_1": 100.16, // Access Community - Sunday
	"04_102_0136_6_1": 55.47, // Group Activities - Weekday Daytime
	"04_105_0136_6_1": 100.16 // Group Activities - Sunday
};

export interface RateCorrectionResult {
	invoicesChanged: number;
	linesChanged: number;
	totalDelta: number;
}

/** The per-participant share billed for `activityId`, or 1 for a solo activity. */
function apportionmentFor(
	activityId: string | undefined,
	groupSizes: Map<string, number>
): number {
	if (!activityId) return 1;

	return groupSizes.get(activityId) ?? 1;
}

function correctLine(
	line: InvoiceVersionLine,
	groupSizes: Map<string, number>
): InvoiceVersionLine {
	const baseRate = OLD_BASE_RATES[line.supportItemCode];

	if (baseRate === undefined) return line;

	const share = apportionmentFor(line.activityId, groupSizes);
	const unitPrice = share > 1 ? floorToCent(baseRate / share) : baseRate;

	// TRAVEL_TIME carries the hourly rate against a quantity in minutes; every
	// other kind bills its quantity directly. Mirrors `billableLines`.
	const total =
		line.kind === "TRAVEL_TIME"
			? round((unitPrice / 60) * line.quantity, 2)
			: round(unitPrice * line.quantity, 2);

	return { ...line, unitPrice, total };
}

export async function correctFy2526LegacyRates(
	apply: boolean
): Promise<RateCorrectionResult> {
	const cutoffs = await prisma.invoice.findMany({
		where: { invoiceNo: { in: CUTOFF_INVOICE_NOS } },
		select: { invoiceNo: true, clientId: true, date: true }
	});

	if (cutoffs.length !== CUTOFF_INVOICE_NOS.length) {
		const found = new Set(cutoffs.map((c) => c.invoiceNo));

		throw new Error(
			`Cutoff invoice(s) not found: ${CUTOFF_INVOICE_NOS.filter((n) => !found.has(n)).join(", ")}`
		);
	}

	const invoices = await prisma.invoice.findMany({
		where: {
			OR: cutoffs.map((cutoff) => ({
				clientId: cutoff.clientId,
				date: { gte: FY_START, lt: cutoff.date }
			}))
		},
		select: {
			id: true,
			invoiceNo: true,
			date: true,
			client: { select: { name: true } },
			versions: { select: { id: true, versionNumber: true, content: true } },
			activities: {
				select: {
					id: true,
					groupSize: true,
					supportItem: { select: { isGroup: true } }
				}
			}
		},
		orderBy: [{ clientId: "asc" }, { date: "asc" }]
	});

	console.log(
		`${invoices.length} invoice(s) in scope${apply ? "" : " (dry run - no writes)"}.`
	);

	let invoicesChanged = 0;
	let linesChanged = 0;
	let totalDelta = 0;

	for (const invoice of invoices) {
		const label = `${invoice.client.name} ${invoice.invoiceNo} (${invoice.date.toISOString().slice(0, 10)})`;

		const groupSizes = new Map(
			invoice.activities
				.filter((activity) => activity.supportItem.isGroup)
				.map((activity) => [activity.id, activity.groupSize ?? 2] as const)
		);

		for (const version of invoice.versions) {
			const content = invoiceVersionContentSchema.parse(version.content);
			const lines = content.lines.map((line) => correctLine(line, groupSizes));
			const changed = lines.filter(
				(line, i) =>
					line.unitPrice !== content.lines[i].unitPrice ||
					line.total !== content.lines[i].total
			).length;

			if (changed === 0) continue;

			const total = round(
				lines.reduce((sum, line) => sum + line.total, 0),
				2
			);
			const next = invoiceVersionContentSchema.parse({
				...content,
				lines,
				total
			});
			const delta = round(total - content.total, 2);

			console.log(
				`${label} v${version.versionNumber}: ${changed} line(s), ` +
					`${content.total.toFixed(2)} -> ${total.toFixed(2)} (${delta.toFixed(2)})`
			);

			if (apply) {
				await prisma.invoiceVersion.update({
					where: { id: version.id },
					data: { content: next, total }
				});
			}

			invoicesChanged += 1;
			linesChanged += changed;
			totalDelta = round(totalDelta + delta, 2);
		}
	}

	console.log(
		`${apply ? "Applied" : "Would change"}: ${invoicesChanged} version(s), ` +
			`${linesChanged} line(s), net ${totalDelta.toFixed(2)}.`
	);

	return { invoicesChanged, linesChanged, totalDelta };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	correctFy2526LegacyRates(process.argv.includes("--apply"))
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		})
		.finally(async () => {
			await prisma.$disconnect();
		});
}
