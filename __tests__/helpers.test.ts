import { Prisma } from "@prisma/client";
import {
	getRateForActivity,
	getTotalCostOfActivities,
} from "@/lib/activity-utils";
import { formatDuration, getDuration } from "@/lib/date-utils";
import { round } from "@/lib/generic-utils";
import { getHighestInvoiceNo, getNextInvoiceNo } from "@/lib/invoice-utils";
import { getNonLabourTravelCode } from "@/lib/support-item-utils";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const getActivity = (
	day: "weekday" | "saturday" | "sunday",
	startTime: string,
	endTime: string,
	transitDuration: number,
	transitDistance: number
) => {
	let date = new Date();
	if (day === "weekday") date = new Date("2022-01-14");
	if (day === "saturday") date = new Date("2022-01-15");
	if (day === "sunday") date = new Date("2022-01-16");

	return {
		date: date,
		startTime: dayjs.utc(`1970-01-01T${startTime}`).toDate(),
		endTime: dayjs.utc(`1970-01-01T${endTime}`).toDate(),
		transitDuration: new Prisma.Decimal(transitDuration),
		transitDistance: new Prisma.Decimal(transitDistance),
		supportItem: {
			description: "Support Item",
			weekdayCode: "04_104_0125_6_1",
			weekdayRate: new Prisma.Decimal(55.47),
			weeknightCode: "04_103_0125_6_1",
			weeknightRate: new Prisma.Decimal(61.05),
			saturdayCode: "04_105_0125_6_1",
			saturdayRate: new Prisma.Decimal(77.81),
			sundayCode: "04_106_0125_6_1",
			sundayRate: new Prisma.Decimal(100.16),
		},
	};
};

const dateFromTime = (time: string) => dayjs.utc(`1970-01-01T${time}`).toDate();

// TODO: Break this up into individual util test files
describe("Helpers", () => {
	it("Should get duration", () => {
		expect(getDuration(dateFromTime("12:00"), dateFromTime("13:00"))).toEqual(
			1
		);
		expect(getDuration(dateFromTime("12:00"), dateFromTime("13:01"))).toEqual(
			1.016_666_666_666_666_6
		);
		expect(getDuration(dateFromTime("10:00"), dateFromTime("18:05"))).toEqual(
			8.083_333_333_333_334
		);
		expect(getDuration(dateFromTime("09:00"), dateFromTime("09:14"))).toEqual(
			0.233_333_333_333_333_34
		);
		expect(getDuration(dateFromTime("09:30"), dateFromTime("15:10"))).toEqual(
			5.666_666_666_666_667
		);
	});

	it("Should get pretty duration", () => {
		expect(
			formatDuration(getDuration(dateFromTime("12:00"), dateFromTime("13:00")))
		).toEqual("1 hour");

		expect(
			formatDuration(getDuration(dateFromTime("12:00"), dateFromTime("13:01")))
		).toEqual("1 hour, 1 min");

		expect(
			formatDuration(getDuration(dateFromTime("13:00"), dateFromTime("15:00")))
		).toEqual("2 hours");

		expect(
			formatDuration(getDuration(dateFromTime("13:00"), dateFromTime("15:30")))
		).toEqual("2 hours, 30 mins");

		expect(
			formatDuration(getDuration(dateFromTime("01:20"), dateFromTime("15:00")))
		).toEqual("13 hours, 40 mins");

		expect(
			formatDuration(getDuration(dateFromTime("09:12"), dateFromTime("13:34")))
		).toEqual("4 hours, 22 mins");

		expect(
			formatDuration(getDuration(dateFromTime("09:00"), dateFromTime("09:14")))
		).toEqual("14 mins");
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

	it("Should round correctly", () => {
		expect(round(10, 2)).toEqual(10);
		expect(round(3.546_77, 2)).toEqual(3.55);
		expect(round(10.1, 2)).toEqual(10.1);
		expect(round(1.555, 2)).toEqual(1.56);
		expect(round(1.55, 1)).toEqual(1.6);
		expect(round(1.5, 0)).toEqual(2);
		expect(round(305.085, 2)).toEqual(305.09);
	});

	const baseActivity = {
		date: new Date("2022-01-14"),
		startTime: dayjs.utc("1970-01-01T15:00").toDate(),
		endTime: dayjs.utc("1970-01-01T17:00").toDate(),
		transitDuration: new Prisma.Decimal(7),
		transitDistance: new Prisma.Decimal(15),
		itemDistance: null,
		supportItem: {
			weekdayCode: "weekday",
			weekdayRate: new Prisma.Decimal(1),
			weeknightCode: "weeknight",
			weeknightRate: new Prisma.Decimal(2),
			saturdayCode: "saturday",
			saturdayRate: new Prisma.Decimal(3),
			sundayCode: "sunday",
			sundayRate: new Prisma.Decimal(4),
		},
	};

	it("Should return correct rates", () => {
		const activity = { ...baseActivity };

		// Regular weekday - weekday
		expect(getRateForActivity(activity)).toEqual(["weekday", 1]);

		// After 8pm - weeknight
		activity.endTime = dayjs.utc("1970-01-01T20:10").toDate();
		expect(getRateForActivity(activity)).toEqual(["weeknight", 2]);

		// At 8pm - weeknight
		activity.endTime = dayjs.utc("1970-01-01T20:00").toDate();
		expect(getRateForActivity(activity)).toEqual(["weeknight", 2]);

		// Saturday - saturday
		activity.date = new Date("2022-01-15");
		activity.endTime = dayjs.utc("1970-01-01T15:10").toDate();
		expect(getRateForActivity(activity)).toEqual(["saturday", 3]);

		// Saturday night - saturday
		activity.date = new Date("2022-01-15");
		activity.endTime = dayjs.utc("1970-01-01T20:10").toDate();
		expect(getRateForActivity(activity)).toEqual(["saturday", 3]);

		// Sunday - sunday
		activity.date = new Date("2022-01-16");
		activity.endTime = dayjs.utc("1970-01-01T15:10").toDate();
		expect(getRateForActivity(activity)).toEqual(["sunday", 4]);

		// Sunday night - sunday
		activity.date = new Date("2022-01-16");
		activity.endTime = dayjs.utc("1970-01-01T20:10").toDate();
		expect(getRateForActivity(activity)).toEqual(["sunday", 4]);
	});

	it("Should return correct rates", () => {
		const activityWithRates = {
			...baseActivity,
			supportItem: {
				...baseActivity.supportItem,
				supportItemRates: [
					{
						weekdayRate: new Prisma.Decimal(5),
						weeknightRate: new Prisma.Decimal(6),
						saturdayRate: new Prisma.Decimal(7),
						sundayRate: new Prisma.Decimal(8),
					},
				],
			},
		};

		// Regular weekday - weekday
		expect(getRateForActivity(activityWithRates)).toEqual(["weekday", 5]);

		// After 8pm - weeknight
		activityWithRates.endTime = dayjs.utc("1970-01-01T20:10").toDate();
		expect(getRateForActivity(activityWithRates)).toEqual(["weeknight", 6]);

		// At 8pm - weeknight
		activityWithRates.endTime = dayjs.utc("1970-01-01T20:00").toDate();
		expect(getRateForActivity(activityWithRates)).toEqual(["weeknight", 6]);

		// Saturday - saturday
		activityWithRates.date = new Date("2022-01-15");
		activityWithRates.endTime = dayjs.utc("1970-01-01T15:10").toDate();
		expect(getRateForActivity(activityWithRates)).toEqual(["saturday", 7]);

		// Saturday night - saturday
		activityWithRates.date = new Date("2022-01-15");
		activityWithRates.endTime = dayjs.utc("1970-01-01T20:10").toDate();
		expect(getRateForActivity(activityWithRates)).toEqual(["saturday", 7]);

		// Sunday - sunday
		activityWithRates.date = new Date("2022-01-16");
		activityWithRates.endTime = dayjs.utc("1970-01-01T15:10").toDate();
		expect(getRateForActivity(activityWithRates)).toEqual(["sunday", 8]);

		// Sunday night - sunday
		activityWithRates.date = new Date("2022-01-16");
		activityWithRates.endTime = dayjs.utc("1970-01-01T20:10").toDate();
		expect(getRateForActivity(activityWithRates)).toEqual(["sunday", 8]);
	});

	it("Should return correct total", () => {
		expect(
			getTotalCostOfActivities([getActivity("weekday", "16:00", "17:00", 0, 0)])
		).toEqual(55.47);

		expect(
			getTotalCostOfActivities([
				getActivity("weekday", "15:00", "17:00", 7, 15),
			])
		).toEqual(130.16);

		expect(
			getTotalCostOfActivities([
				getActivity("weekday", "15:00", "17:00", 7, 15),
				getActivity("weekday", "15:00", "21:00", 7, 15),
			])
		).toEqual(516.33);

		expect(
			getTotalCostOfActivities([
				getActivity("saturday", "15:00", "17:00", 7, 15),
			])
		).toEqual(177.45);

		expect(
			getTotalCostOfActivities([
				getActivity("saturday", "19:00", "21:00", 7, 15),
			])
		).toEqual(177.45);

		expect(
			getTotalCostOfActivities([getActivity("weekday", "09:30", "15:00", 0, 0)])
		).toEqual(305.09);

		expect(
			getTotalCostOfActivities([getActivity("weekday", "09:30", "15:10", 0, 0)])
		).toEqual(314.33);

		expect(
			getTotalCostOfActivities([getActivity("weekday", "16:10", "20:10", 0, 0)])
		).toEqual(244.2);

		expect(
			getTotalCostOfActivities([
				getActivity("weekday", "09:30", "15:00", 15, 7),
				getActivity("weekday", "09:30", "15:10", 15, 7),
				getActivity("weekday", "09:30", "15:23", 15, 7),
			])
		).toEqual(1005.23);

		expect(
			getTotalCostOfActivities([
				getActivity("weekday", "09:30", "15:00", 15, 7),
				getActivity("weekday", "09:30", "15:00", 15, 7),
				getActivity("weekday", "09:30", "15:00", 15, 7),
				getActivity("weekday", "09:30", "15:00", 15, 7),
				getActivity("weekday", "09:30", "15:10", 15, 7),
				getActivity("weekday", "09:30", "15:10", 15, 7),
				getActivity("weekday", "09:30", "15:25", 15, 7),
			])
		).toEqual(2315.96);
	});

	it("Should return correct provider travel - non-labour costs code", () => {
		expect(getNonLabourTravelCode("04_104_0125_6_1")).toEqual(
			"04_799_0125_6_1"
		);
		expect(getNonLabourTravelCode("04_102_0136_6_1")).toEqual(
			"04_799_0136_6_1"
		);
	});
});
