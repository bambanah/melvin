// @vitest-environment node
import generatePDF, { renderInvoicePdf } from "@/lib/pdf-generation";
import {
	getFixture,
	invoiceFixtures,
	toRenderInput
} from "@/lib/testing/invoice-fixtures";
import { extractPdfText } from "@/lib/testing/pdf-test-utils";
import { describe, expect, test, vi } from "vitest";

// pdfjs breaks under the project-default jsdom environment, hence the
// node environment directive above

vi.mock("@/server/prisma", async () => {
	const { invoiceFixtures, mockPrismaForFixtures } =
		await import("@/lib/testing/invoice-fixtures");

	return mockPrismaForFixtures(invoiceFixtures);
});

/**
 * Named invariants per fixture: support item codes and the grand total.
 * When one of these fails, the error names the broken pricing rule instead
 * of just "snapshot changed". The file snapshots below remain the full
 * golden masters.
 */
const invariants: Record<string, { contains: string[]; excludes?: string[] }> =
	{
		"basic-weekday": {
			// "Access Community Social and Rec Activ - Standard" wraps inside
			// the Description cell, so match a wrap-safe prefix
			contains: [
				"Access Community",
				"04_104_0125_6_1",
				"$62.17/hr",
				"$124.34",
				"Sample Bank"
			]
		},
		weeknight: { contains: ["04_103_0125_6_1", "$68.50/hr", "$137.00"] },
		saturday: { contains: ["04_105_0125_6_1", "$87.51/hr", "$175.02"] },
		sunday: { contains: ["04_106_0125_6_1", "$112.85/hr", "$225.70"] },
		"client-custom-rates": {
			// Custom weekday + saturday rates apply; weeknight falls back to base
			contains: ["$60.00/hr", "$80.00/hr", "$68.50/hr", "$417.00"]
		},
		"km-rate-type": {
			contains: ["04_590_0125_6_1", "34 km", "$0.97/km", "$32.98"]
		},
		"transit-solo": {
			contains: [
				// Cell text wraps mid-phrase in the rendered table, so match the
				// unwrapped prefix only
				"Provider travel - labour",
				"Provider travel - non-labour",
				"04_799_0125_6_1",
				"$0.85/km",
				"$31.09",
				"$12.75",
				"$168.18"
			]
		},
		"transit-group": {
			// The 0136 (group) registration group derives the group non-labour
			// travel code, billed at $0.43/km on the line item AND in the Total
			// (Q1 fixed: both now go through getTransitRate)
			contains: ["04_799_0136_6_1", "$0.43/km", "$6.45", "$161.88"]
		},
		"transport-all-types": {
			contains: [
				// All four transport rows share the price-guide item name; the
				// expense type + note print in the Details column
				"Activity Based Transport",
				"04_590_0125_6_1",
				"22 km",
				"$0.99/km",
				"$21.78",
				"Parking - Airport parking",
				"Toll - CityLink",
				"Other Transport Expense",
				"$172.32"
			]
		},
		"transport-group-distance": {
			contains: ["04_591_0136_6_1", "$0.49/km", "$10.78", "$135.12"]
		},
		"duplicate-merge": { contains: ["$186.51"] },
		"kitchen-sink": {
			contains: [
				"04_104_0125_6_1",
				"04_103_0125_6_1",
				"04_105_0125_6_1",
				"04_106_0125_6_1",
				"04_799_0125_6_1",
				"04_590_0125_6_1",
				"Participant Number: 431234567",
				"Bill To: HELP Plan Managers",
				"$720.77"
			]
		},
		"no-payment-footer": {
			contains: ["04_104_0125_6_1", "$124.34"],
			// Footer requires all five bank fields; bankName is missing
			excludes: ["Sample Bank", "ABN", "BSB", "Account Number"]
		},
		// Fixtures 14–16 are modelled on real de-identified invoices; the
		// expected strings below match the originals' printed output
		"saturday-odd-duration": {
			contains: [
				"04_105_0125_6_1",
				"08:50-14:15 (5 hours, 25 mins)",
				"$98.83/hr",
				"$535.33"
			]
		},
		"recurring-slot": {
			contains: [
				"04_104_0125_6_1",
				"14:35-16:35 (2 hours)",
				"$140.46",
				"$421.38"
			]
		},
		"plan-managed-week": {
			contains: [
				"Participant Number: 430123456",
				"Bill To: Banksia Plan Management",
				"04_104_0125_6_1",
				"04_105_0125_6_1",
				"04_102_0136_6_1",
				"04_590_0125_6_1",
				"04_591_0136_6_1",
				"04_799_0125_6_1",
				"04_799_0136_6_1",
				"13:20-14:25 (1 hour, 5 mins)",
				"$0.49/km",
				"$0.43/km",
				// The source invoice printed $1168.15 ($7.28 above its line-item
				// sum — quirk Q1); with Q1 fixed the Total equals the line items.
				// Once the user's 0.85 rate is threaded through (this plan), the
				// two solo travel legs drop from $0.99/km to $0.85/km.
				"$1153.59"
			]
		}
	};

describe("invoice PDF text golden masters", () => {
	test.each(invoiceFixtures.map((fixture) => [fixture.name, fixture] as const))(
		"%s",
		async (name, fixture) => {
			const { pdfString, fileName } = renderInvoicePdf(toRenderInput(fixture));

			expect(fileName).toEqual(`${fixture.invoice.invoiceNo}.pdf`);
			expect(pdfString.length).toBeGreaterThan(0);

			const text = await extractPdfText(pdfString);

			expect(text).toContain(`Invoice Number: ${fixture.invoice.invoiceNo}`);
			expect(text).toContain(
				`Participant Name: ${fixture.invoice.client.name}`
			);
			expect(text).toContain("Total");

			const { contains, excludes } = invariants[name];
			for (const expected of contains) {
				expect(text).toContain(expected);
			}
			for (const excluded of excludes ?? []) {
				expect(text).not.toContain(excluded);
			}

			await expect(text).toMatchFileSnapshot(`__pdf_text__/${name}.txt`);
		}
	);
});

describe("generatePDF loader", () => {
	test("loads an invoice by id + ownerId and renders it", async () => {
		const fixture = getFixture("basic-weekday");

		const { pdfString, fileName } = await generatePDF(
			fixture.invoice.id,
			fixture.invoice.ownerId
		);

		expect(fileName).toEqual(`${fixture.invoice.invoiceNo}.pdf`);
		expect(pdfString.length).toBeGreaterThan(0);
	});

	test("returns an empty result when ownerId doesn't match the invoice", async () => {
		const fixture = getFixture("basic-weekday");

		const { pdfString, fileName } = await generatePDF(
			fixture.invoice.id,
			"someone-elses-user-id"
		);

		expect(pdfString).toEqual("");
		expect(fileName).toBeNull();
	});
});
