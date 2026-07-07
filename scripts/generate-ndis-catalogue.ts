/**
 * Converts the bundled NDIS support-catalogue XLSX into the flat JSON array
 * consumed by `src/lib/support-item-utils.ts`.
 *
 * Annual refresh: drop the new "Clean - NDIS Support Catalogue" XLSX in
 * `docs/ndis/`, update `SOURCE_XLSX` below, then run `pnpm catalogue:generate`.
 *
 * Run: `pnpm exec tsx scripts/generate-ndis-catalogue.ts`
 * (or `pnpm catalogue:generate`).
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const SOURCE_XLSX = resolve(
	repoRoot,
	"docs/ndis/Clean - NDIS Support Catalogue - 2026-27 v1.0.xlsx"
);
const OUTPUT_JSON = resolve(repoRoot, "src/lib/ndis-support-catalogue.json");

// Only the currently-priced items feed autocomplete and the travel/ABT lookups;
// the "Legacy Support Items" sheet holds superseded items we do not surface.
const SHEET_NAME = "Current Support Items";

/** Raw row keyed by the XLSX header labels. */
type CatalogueRow = Record<string, string | number | null>;

/**
 * Output shape mirrors the field names and value types of the previous
 * (2022-23) catalogue JSON for the fields consumed by code
 * (`supportItemNumber`, `supportItemName`, `registrationGroupNumber`,
 * `registrationGroupName`, `supportCategoryName`). Pricing columns follow the
 * 2026-27 catalogue's National/Remote/Very Remote model (no code consumes them).
 */
interface SupportItem {
	supportItemNumber: string;
	supportItemName: string;
	registrationGroupNumber: number;
	registrationGroupName: string;
	supportCategoryNumber: number | null;
	supportCategoryName: string;
	unit: string | null;
	quote: string | null;
	startDate: string;
	endDate: number | null;
	national: number | null;
	remote: number | null;
	veryRemote: number | null;
	nonFaceToFaceSupportProvision: string | null;
	providerTravel: string | null;
	shortNoticeCancellations: string | null;
	ndiaRequestedReports: string | null;
	irregularSILSupports: string | null;
	type: string | null;
}

const str = (value: string | number | null): string | null =>
	value === null || value === undefined ? null : String(value).trim();

const num = (value: string | number | null): number | null => {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? null : parsed;
};

function main() {
	const workbook = XLSX.readFile(SOURCE_XLSX);
	console.log(`Sheets: ${workbook.SheetNames.join(", ")}`);

	const sheet = workbook.Sheets[SHEET_NAME];
	if (!sheet) {
		throw new Error(
			`Sheet "${SHEET_NAME}" not found in ${SOURCE_XLSX}. Sheets: ${workbook.SheetNames.join(", ")}`
		);
	}

	const rows = XLSX.utils.sheet_to_json<CatalogueRow>(sheet, { defval: null });
	if (rows.length === 0) {
		throw new Error(`Sheet "${SHEET_NAME}" is empty.`);
	}
	console.log(`Header columns: ${Object.keys(rows[0]).join(" | ")}`);

	const items: SupportItem[] = rows.map((row) => ({
		supportItemNumber: str(row["Support Item Number"]) ?? "",
		supportItemName: str(row["Support Item Name"]) ?? "",
		// XLSX stores the group number as a zero-padded string ("0125"); the old
		// JSON and `support-item-utils.ts` lookups compare it as a number.
		registrationGroupNumber: num(row["Registration Group Number"]) ?? 0,
		registrationGroupName: str(row["Registration Group Name"]) ?? "",
		supportCategoryNumber: num(row["Support Category Number"]),
		supportCategoryName: str(row["Support Category Name"]) ?? "",
		unit: str(row["Unit"]),
		quote: str(row["Quote"]),
		// Old JSON kept startDate as a string ("20220701").
		startDate: str(row["Start date"]) ?? "",
		endDate: num(row["End Date"]),
		national: num(row["National"]),
		remote: num(row["Remote"]),
		veryRemote: num(row["Very Remote"]),
		nonFaceToFaceSupportProvision: str(
			row["Non-Face-to-Face Support Provision"]
		),
		providerTravel: str(row["Provider Travel"]),
		shortNoticeCancellations: str(row["Short Notice Cancellations."]),
		ndiaRequestedReports: str(row["NDIA Requested Reports"]),
		irregularSILSupports: str(row["Irregular SIL Supports"]),
		type: str(row["Type"])
	}));

	writeFileSync(OUTPUT_JSON, `${JSON.stringify(items, null, "\t")}\n`);
	console.log(`Wrote ${items.length} support items to ${OUTPUT_JSON}`);
}

main();
