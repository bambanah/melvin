import { getHighestInvoiceNo, getNextInvoiceNo } from "@/lib/invoice-utils";

it("Should get latest invoice number", () => {
	expect(getHighestInvoiceNo(["Gawne1", "Gawne2", "Gawne3"])).toEqual("Gawne3");

	expect(getHighestInvoiceNo(["Gawne1"])).toEqual("Gawne1");
	expect(getHighestInvoiceNo([])).toEqual(undefined);
	expect(getHighestInvoiceNo(["Gawne", "string"])).toEqual(undefined);
});

it("Should get next invoice number", () => {
	expect(
		getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne3"]).nextInvoiceNo
	).toEqual("Gawne4");
	expect(
		getNextInvoiceNo(["Client-1", "Client-2", "Client-3"]).nextInvoiceNo
	).toEqual("Client-4");
	expect(
		getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne-3"]).nextInvoiceNo
	).toEqual("Gawne-4");
	expect(getNextInvoiceNo([]).nextInvoiceNo).toEqual("");
	expect(getNextInvoiceNo(["Gawne1"]).nextInvoiceNo).toEqual("Gawne2");
	expect(getNextInvoiceNo(["Gawne01", "Gawne02"]).nextInvoiceNo).toEqual(
		"Gawne03"
	);
});
