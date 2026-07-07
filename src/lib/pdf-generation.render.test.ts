// @vitest-environment node
import { renderInvoicePdf } from "@/lib/pdf-generation";
import { getFixture, toRenderInput } from "@/lib/testing/invoice-fixtures";
import { comparePng, renderPdfPageToPng } from "@/lib/testing/pdf-test-utils";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Committed PNG renders of sample invoices. GitHub shows changed PNGs with
 * swipe/onion-skin comparison in PR diffs, so a pricing/layout change is
 * visually reviewable in the PR itself.
 *
 * Only three fixtures are rendered to keep repo growth bounded; the text
 * golden masters in pdf-generation.text.test.ts carry correctness for all
 * sixteen. Baselines are authored on Linux (CI is authoritative); regenerate
 * locally with UPDATE_PDF_SNAPSHOTS=1 (see e2e/README.md).
 */
const RENDER_FIXTURES = [
	"basic-weekday",
	"transport-all-types",
	"kitchen-sink"
];

const SNAPSHOT_DIR = path.join(import.meta.dirname, "__pdf_snapshots__");

describe("invoice PDF visual snapshots", () => {
	// Escape hatch (currently disarmed): the PDF uses jsPDF's built-in
	// Helvetica, which pdfjs substitutes with its bundled Foxit fonts and
	// rasterizes with bundled Skia — no OS font stack — so Windows/Linux
	// drift should be near zero. If drift ever exceeds tolerance, gate with:
	// test.skipIf(process.platform !== "linux" && !process.env.PDF_SNAPSHOTS)
	test.each(RENDER_FIXTURES)("%s", async (name) => {
		const fixture = getFixture(name);

		const { pdfString } = renderInvoicePdf(toRenderInput(fixture));
		expect(pdfString.length).toBeGreaterThan(0);

		const png = await renderPdfPageToPng(pdfString, 1, 2);

		await comparePng(png, path.join(SNAPSHOT_DIR, `${name}.page1.png`));
	});
});
