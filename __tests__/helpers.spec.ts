import {
	getDuration,
	getHighestInvoiceNo,
	getNextInvoiceNo,
	getPrettyDuration,
	getRate,
	getTotalCost,
	round,
} from "@utils/helpers";
import dayjs from "dayjs";

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
		expect(getHighestInvoiceNo([])).toEqual(undefined);
		expect(getHighestInvoiceNo(["Gawne", "string"])).toEqual(undefined);
	});

	it("Should get next invoice number", () => {
		expect(getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne3"], "Client")).toEqual(
			"Client4"
		);
		expect(
			getNextInvoiceNo(["Client-1", "Client-2", "Client-3"], "Client")
		).toEqual("Client4");
		expect(getNextInvoiceNo(["Gawne1", "Gawne2", "Gawne3"], "Gawne")).toEqual(
			"Gawne4"
		);
		expect(getNextInvoiceNo([], "Gawne")).toEqual("Gawne1");
		expect(getNextInvoiceNo(["Gawne1"], "Gawne--")).toEqual("Gawne2");
		expect(getNextInvoiceNo([], "")).toEqual("");
	});

	it("Should round correctly", () => {
		expect(round(10, 2)).toEqual(10);
		expect(round(3.546_77, 2)).toEqual(3.55);
		expect(round(10.1, 2)).toEqual(10.1);
		expect(round(1.555, 2)).toEqual(1.56);
		expect(round(1.55, 1)).toEqual(1.6);
		expect(round(1.5, 0)).toEqual(2);
	});

	it("Should return correct rates", () => {
		const activity = {
			date: new Date("2022-01-14"),
			startTime: dayjs("1970-01-01T15:00").toDate(),
			endTime: dayjs("1970-01-01T17:00").toDate(),
			transitDuration: 7,
			transitDistance: 15,
			supportItem: {
				weekdayCode: "weekday",
				weekdayRate: 1,
				weeknightCode: "weeknight",
				weeknightRate: 2,
				saturdayCode: "saturday",
				saturdayRate: 3,
				sundayCode: "sunday",
				sundayRate: 4,
			},
		};

		// Regular weekday - weekday
		expect(getRate(activity)).toEqual(["weekday", 1]);

		// After 8pm - weeknight
		activity.endTime = dayjs("1970-01-01T20:10").toDate();
		expect(getRate(activity)).toEqual(["weeknight", 2]);

		// At 8pm - weeknight
		activity.endTime = dayjs("1970-01-01T20:00").toDate();
		expect(getRate(activity)).toEqual(["weeknight", 2]);

		// Saturday - saturday
		activity.date = new Date("2022-01-15");
		activity.endTime = dayjs("1970-01-01T15:10").toDate();
		expect(getRate(activity)).toEqual(["saturday", 3]);

		// Saturday night - saturday
		activity.date = new Date("2022-01-15");
		activity.endTime = dayjs("1970-01-01T20:10").toDate();
		expect(getRate(activity)).toEqual(["saturday", 3]);

		// Sunday - sunday
		activity.date = new Date("2022-01-16");
		activity.endTime = dayjs("1970-01-01T15:10").toDate();
		expect(getRate(activity)).toEqual(["sunday", 4]);

		// Sunday night - sunday
		activity.date = new Date("2022-01-16");
		activity.endTime = dayjs("1970-01-01T20:10").toDate();
		expect(getRate(activity)).toEqual(["sunday", 4]);
	});

	it("Should return correct total", () => {
		// TODO: Expand this test immensely
		const activities = [
			{
				date: new Date("2022-01-06"),
				startTime: dayjs("1970-01-01T15:03").toDate(),
				endTime: dayjs("1970-01-01T19:52").toDate(),
				transitDistance: 7,
				transitDuration: 15,
				supportItem: {
					weekdayCode: "weekday",
					weekdayRate: 54.3,
					weeknightCode: "weeknight",
					weeknightRate: 20,
					saturdayCode: "saturday",
					saturdayRate: 30,
					sundayCode: "sunday",
					sundayRate: 40,
				},
			},
		];

		expect(getTotalCost(activities)).toEqual(281.09);

		activities.push({
			date: new Date("2022-01-13"),
			startTime: dayjs("1970-01-01T16:00").toDate(),
			endTime: dayjs("1970-01-01T16:06").toDate(),
			transitDistance: 7,
			transitDuration: 45,
			supportItem: {
				weekdayCode: "weekday",
				weekdayRate: 54.3,
				weeknightCode: "weeknight",
				weeknightRate: 20,
				saturdayCode: "saturday",
				saturdayRate: 30,
				sundayCode: "sunday",
				sundayRate: 40,
			},
		});

		expect(getTotalCost(activities)).toEqual(333.19);
	});
});
