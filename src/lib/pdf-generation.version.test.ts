// @vitest-environment node
import {
	renderInvoicePdf,
	renderInvoiceVersionPdf
} from "@/lib/pdf-generation";
import { buildInvoiceVersionContent } from "@/lib/invoice-version";
import { getFixture, toRenderInput } from "@/lib/testing/invoice-fixtures";
import { extractPdfText } from "@/lib/testing/pdf-test-utils";
import { describe, expect, test } from "vitest";

// pdfjs breaks under the project-default jsdom environment, hence the
// node environment directive above.

describe("draft (live) rendering", () => {
	test("no watermark by default", async () => {
		const fixture = getFixture("kitchen-sink");

		const { pdfString } = renderInvoicePdf(toRenderInput(fixture));
		const text = await extractPdfText(pdfString);

		expect(text).not.toContain("DRAFT");
	});

	test("draftWatermark: true overlays DRAFT without changing the line data", async () => {
		const fixture = getFixture("kitchen-sink");

		const { pdfString } = renderInvoicePdf(toRenderInput(fixture), {
			draftWatermark: true
		});
		const text = await extractPdfText(pdfString);

		expect(text).toContain("DRAFT");
		expect(text).toContain("$720.77");
	});
});

describe("frozen version rendering", () => {
	test("v1 prints the plain invoice number, no supersedes line", async () => {
		const fixture = getFixture("kitchen-sink");
		const content = buildInvoiceVersionContent(toRenderInput(fixture), {
			versionNumber: 1
		});

		const { pdfString, fileName } = renderInvoiceVersionPdf(content);
		const text = await extractPdfText(pdfString);

		expect(fileName).toBe("SINK-1.pdf");
		expect(text).toContain("Invoice Number: SINK-1");
		expect(text).not.toContain("supersedes");
		expect(text).not.toContain("DRAFT");
	});

	test("v2 prints the suffixed display number and the supersedes line", async () => {
		const fixture = getFixture("kitchen-sink");
		const content = buildInvoiceVersionContent(toRenderInput(fixture), {
			versionNumber: 2,
			previousDisplayInvoiceNo: "SINK-1"
		});

		const { pdfString, fileName } = renderInvoiceVersionPdf(content);
		const text = await extractPdfText(pdfString);

		expect(fileName).toBe("SINK-1a.pdf");
		expect(text).toContain("Invoice Number: SINK-1a");
		expect(text).toContain("This invoice amends and supersedes SINK-1");
	});

	test("renders byte-identically to the live golden text for the same data", async () => {
		const fixture = getFixture("kitchen-sink");
		const content = buildInvoiceVersionContent(toRenderInput(fixture), {
			versionNumber: 1
		});

		const live = renderInvoicePdf(toRenderInput(fixture));
		const version = renderInvoiceVersionPdf(content);

		const liveText = await extractPdfText(live.pdfString);
		const versionText = await extractPdfText(version.pdfString);

		expect(versionText).toEqual(liveText);
	});
});
