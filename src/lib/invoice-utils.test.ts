import {
	getHighestInvoiceNo,
	getNextInvoiceNo,
	invoiceCandidatesFromPaymentAmount,
	invoiceVersionSuffix,
	displayInvoiceNo
} from "@/lib/invoice-utils";
import { expect, test } from "vitest";

test("Should get latest invoice number", () => {
	expect(getHighestInvoiceNo(["Sample1", "Sample2", "Sample3"])).toEqual(
		"Sample3"
	);

	expect(getHighestInvoiceNo(["Sample1"])).toEqual("Sample1");
	expect(getHighestInvoiceNo([])).toEqual(undefined);
	expect(getHighestInvoiceNo(["Sample", "string"])).toEqual(undefined);
});

test("Should pick the highest numeric suffix regardless of order", () => {
	expect(getHighestInvoiceNo(["INV-001", "INV-003", "INV-002"])).toEqual(
		"INV-003"
	);
});

test("Should skip non-numeric entries when finding the highest", () => {
	// Non-numeric entry must be ignored even when it seeds the reduce
	expect(getHighestInvoiceNo(["DRAFT", "INV-002"])).toEqual("INV-002");
	expect(getHighestInvoiceNo(["INV-002", "DRAFT"])).toEqual("INV-002");
	// All non-numeric → nothing to compare
	expect(getHighestInvoiceNo(["DRAFT", "FINAL"])).toEqual(undefined);
});

test("Should get next invoice number", () => {
	expect(
		getNextInvoiceNo(["Sample1", "Sample2", "Sample3"]).nextInvoiceNo
	).toEqual("Sample4");
	expect(
		getNextInvoiceNo(["Client-1", "Client-2", "Client-3"]).nextInvoiceNo
	).toEqual("Client-4");
	expect(
		getNextInvoiceNo(["Sample1", "Sample2", "Sample-3"]).nextInvoiceNo
	).toEqual("Sample-4");
	expect(getNextInvoiceNo([]).nextInvoiceNo).toEqual("");
	expect(getNextInvoiceNo(["Sample1"]).nextInvoiceNo).toEqual("Sample2");
	expect(getNextInvoiceNo(["Sample01", "Sample02"]).nextInvoiceNo).toEqual(
		"Sample03"
	);
	expect(getNextInvoiceNo(["A-08", "A-09"]).nextInvoiceNo).toEqual("A-10");
});

test("Should find single invoice matching payment amount", () => {
	expect(
		invoiceCandidatesFromPaymentAmount(10.1, new Map([[10.1, "INV-1"]]))
	).toEqual([["INV-1"]]);
});

test("Should find multi-invoice combination matching payment amount", () => {
	expect(
		invoiceCandidatesFromPaymentAmount(
			10.1,
			new Map<number, string | string[]>([
				[3.3, "INV-1"],
				[6.8, "INV-2"]
			])
		)
	).toEqual([["INV-1", "INV-2"]]);
});

test("Should find all valid combinations matching payment amount", () => {
	expect(
		invoiceCandidatesFromPaymentAmount(
			15,
			new Map<number, string | string[]>([
				[5, "INV-1"],
				[10, "INV-2"],
				[15, "INV-3"]
			])
		)
	).toEqual([["INV-3"], ["INV-1", "INV-2"]]);
});

test("Should handle float rounding in payment combinations", () => {
	// Naive summation gives 3.3 + 6.8 = 10.100000000000001; the backtracker
	// rounds partial sums to 2dp so this still matches
	expect(
		invoiceCandidatesFromPaymentAmount(
			10.1,
			new Map<number, string | string[]>([
				[3.3, "INV-1"],
				[6.8, "INV-2"],
				[20, "INV-3"]
			])
		)
	).toEqual([["INV-1", "INV-2"]]);
});

test("Should return no candidates when nothing matches", () => {
	expect(
		invoiceCandidatesFromPaymentAmount(
			7,
			new Map<number, string | string[]>([
				[5, "INV-1"],
				[10, "INV-2"]
			])
		)
	).toEqual([]);

	expect(invoiceCandidatesFromPaymentAmount(7, new Map())).toEqual([]);
});

test("Should return grouped invoice ids for duplicate totals", () => {
	expect(
		invoiceCandidatesFromPaymentAmount(
			10.1,
			new Map<number, string | string[]>([[10.1, ["INV-1", "INV-2"]]])
		)
	).toEqual([[["INV-1", "INV-2"]]]);
});

test("Should return a single empty combination for payment amount of 0", () => {
	// Current behavior: an amount of 0 is "matched" by selecting no invoices
	expect(invoiceCandidatesFromPaymentAmount(0, new Map())).toEqual([[]]);
	expect(
		invoiceCandidatesFromPaymentAmount(0, new Map([[5, "INV-1"]]))
	).toEqual([[]]);
});

test("Should derive invoice version display suffixes", () => {
	expect(invoiceVersionSuffix(1)).toEqual("");
	expect(invoiceVersionSuffix(2)).toEqual("a");
	expect(invoiceVersionSuffix(3)).toEqual("b");
	expect(invoiceVersionSuffix(27)).toEqual("z");
	expect(invoiceVersionSuffix(28)).toEqual("aa");
	expect(invoiceVersionSuffix(29)).toEqual("ab");
	expect(invoiceVersionSuffix(53)).toEqual("az");
	expect(invoiceVersionSuffix(54)).toEqual("ba");
});

test("Should build the display invoice number from the stored number + suffix", () => {
	expect(displayInvoiceNo("INV-001", 1)).toEqual("INV-001");
	expect(displayInvoiceNo("INV-001", 2)).toEqual("INV-001a");
	expect(displayInvoiceNo("INV-001", 28)).toEqual("INV-001aa");
});
