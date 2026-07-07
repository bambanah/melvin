import { invoiceVersionContentSchema } from "@/schema/invoice-version-schema";
import { invoiceFixtures, toRenderInput } from "@/lib/testing/invoice-fixtures";
import { expect, test } from "vitest";
import {
	buildInvoiceVersionContent,
	formatProviderDetails
} from "./invoice-version";

test.each(invoiceFixtures)(
	"builds Zod-valid version content for fixture: $name",
	(fixture) => {
		const content = buildInvoiceVersionContent(toRenderInput(fixture), {
			versionNumber: 1
		});

		expect(() => invoiceVersionContentSchema.parse(content)).not.toThrow();
		expect(content.lines.length).toBeGreaterThan(0);
		expect(content.header.displayInvoiceNo).toEqual(fixture.invoice.invoiceNo);
	}
);

test("stamps the amendsDisplayInvoiceNo header field on versions >= 2", () => {
	const fixture = invoiceFixtures[0];

	const content = buildInvoiceVersionContent(toRenderInput(fixture), {
		versionNumber: 2,
		previousDisplayInvoiceNo: fixture.invoice.invoiceNo
	});

	expect(content.header.displayInvoiceNo).toEqual(
		`${fixture.invoice.invoiceNo}a`
	);
	expect(content.header.amendsDisplayInvoiceNo).toEqual(
		fixture.invoice.invoiceNo
	);
});

test("flags backfilled content", () => {
	const fixture = invoiceFixtures[0];

	const content = buildInvoiceVersionContent(toRenderInput(fixture), {
		versionNumber: 1,
		backfilled: true
	});

	expect(content.backfilled).toBe(true);
});

test("total equals the sum of line totals", () => {
	const fixture = invoiceFixtures.find((f) => f.name === "kitchen-sink")!;

	const content = buildInvoiceVersionContent(toRenderInput(fixture), {
		versionNumber: 1
	});

	const expectedTotal = content.lines.reduce(
		(sum, line) => sum + line.total,
		0
	);
	expect(content.total).toBeCloseTo(expectedTotal, 2);
});

test("formatProviderDetails matches the PDF's printed grouping", () => {
	const fixture = invoiceFixtures.find((f) => f.name === "kitchen-sink")!;

	const provider = formatProviderDetails(fixture.user);

	expect(provider.abn).toEqual("12 345 678 901");
	expect(provider.bsb).toEqual("123-456");
	expect(provider.accountNumber).toEqual("987 654 321");
});

test("formatProviderDetails omits fields when the user is missing bank details", () => {
	const fixture = invoiceFixtures.find((f) => f.name === "no-payment-footer")!;

	const provider = formatProviderDetails(fixture.user);

	expect(provider.bankName).toBeUndefined();
});
