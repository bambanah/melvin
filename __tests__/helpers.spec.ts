import {
	getDuration,
	getHighestInvoiceNo,
	getNextInvoiceNo,
	getPrettyDuration,
} from "@utils/helpers";

describe("Helpers", () => {
	it("Should get duration", () => {
		const duration = getDuration("12:00", "13:00");
		expect(duration).toEqual(1);
		expect(getDuration("12:00", "13:01")).toEqual(1.017);
		expect(getDuration("10:00", "18:05")).toEqual(8.083);
	});

	it("Should get pretty duration", () => {
		expect(getPrettyDuration(getDuration("12:00", "13:00"))).toEqual("1 hour");
		expect(getPrettyDuration(getDuration("12:00", "13:01"))).toEqual(
			"1 hour, 1 min"
		);
		expect(getPrettyDuration(getDuration("13:00", "15:00"))).toEqual("2 hours");
		expect(getPrettyDuration(getDuration("13:00", "15:30"))).toEqual(
			"2 hours, 30 mins"
		);
		expect(getPrettyDuration(getDuration("01:20", "15:00"))).toEqual(
			"13 hours, 40 mins"
		);
		expect(getPrettyDuration(getDuration("09:12", "13:34"))).toEqual(
			"4 hours, 22 mins"
		);
	});

	it("Should get latest invoice number", () => {
		expect(getHighestInvoiceNo(["Gawne1", "Gawne2", "Gawne3"])).toEqual(
			"Gawne3"
		);

		expect(getHighestInvoiceNo(["Gawne1"])).toEqual("Gawne1");
		expect(getHighestInvoiceNo([])).toEqual(null);
		expect(getHighestInvoiceNo(["Gawne", "string"])).toEqual(null);
	});

	it("Should get next invoice number", () => {
		expect(getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne3"], "Client")).toEqual(
			"Client-4"
		);
		expect(
			getNextInvoiceNo(["Client-1", "Client-2", "Client-3"], "Client")
		).toEqual("Client-4");
		expect(getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne3"], "Gawne")).toEqual(
			"Gawne-4"
		);
		expect(getNextInvoiceNo([], "Gawne")).toEqual("Gawne-1");
		expect(getNextInvoiceNo(["Gawne1"], "Gawne--")).toEqual("Gawne-2");
		expect(getNextInvoiceNo([], "")).toEqual("");
	});
});
