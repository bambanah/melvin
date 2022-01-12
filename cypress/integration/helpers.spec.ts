import {
	getDuration,
	getHighestInvoiceNo,
	getNextInvoiceNo,
	getPrettyDuration,
} from "@utils/helpers";

describe("Helpers", () => {
	it("Should get duration", () => {
		expect(getDuration("12:00", "13:00"), "Duration").to.equal(1);
		expect(getDuration("12:00", "13:01"), "Duration").to.equal(1.017);
		expect(getDuration("10:00", "18:05"), "Duration").to.equal(8.083);
	});

	it("Should get pretty duration", () => {
		expect(
			getPrettyDuration(getDuration("12:00", "13:00")),
			"Pretty duration"
		).to.equal("1 hour");
		expect(
			getPrettyDuration(getDuration("12:00", "13:01")),
			"Pretty duration"
		).to.equal("1 hour, 1 min");
		expect(
			getPrettyDuration(getDuration("13:00", "15:00")),
			"Pretty duration"
		).to.equal("2 hours");
		expect(
			getPrettyDuration(getDuration("13:00", "15:30")),
			"Pretty duration"
		).to.equal("2 hours, 30 mins");
		expect(
			getPrettyDuration(getDuration("01:20", "15:00")),
			"Pretty duration"
		).to.equal("13 hours, 40 mins");
		expect(
			getPrettyDuration(getDuration("09:12", "13:34")),
			"Pretty duration"
		).to.equal("4 hours, 22 mins");
	});

	it("Should get latest invoice number", () => {
		expect(
			getHighestInvoiceNo(["Gawne1", "Gawne2", "Gawne3"]),
			"Highest Invoice No"
		).to.equal("Gawne3");

		expect(getHighestInvoiceNo(["Gawne1"]), "Highest Invoice No").to.equal(
			"Gawne1"
		);
		expect(getHighestInvoiceNo([]), "Highest Invoice No").to.equal(null);
		expect(
			getHighestInvoiceNo(["Gawne", "string"]),
			"Highest Invoice No"
		).to.equal(null);
	});

	it("Should get next invoice number", () => {
		expect(getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne3"], "Client")).to.equal(
			"Client-4"
		);
		expect(
			getNextInvoiceNo(["Client-1", "Client-2", "Client-3"], "Client")
		).to.equal("Client-4");
		expect(getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne3"], "Gawne")).to.equal(
			"Gawne-4"
		);
		expect(getNextInvoiceNo([], "Gawne")).to.equal("Gawne-1");
		expect(getNextInvoiceNo(["Gawne1"], "Gawne--")).to.equal("Gawne-2");
		expect(getNextInvoiceNo([], "")).to.equal("");
	});
});
