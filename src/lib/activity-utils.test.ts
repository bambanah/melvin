import {
	getRateForActivity,
	getTotalCostOfActivities
} from "@/lib/activity-utils";
import { Prisma } from "@/generated/client";
import { expect, test } from "vitest";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const getActivity = (
	day: "weekday" | "saturday" | "sunday",
	startTime: string,
	endTime: string,
	transitDuration: number,
	transitDistance: number,
	isGroup: boolean = false
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
			isGroup
		}
	};
};

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
		isGroup: false
	}
};

test("Should return correct rates", () => {
	const activity = { ...baseActivity };

	// Regular weekday - weekday
	expect(getRateForActivity(activity)).toEqual(["weekday", 1]);

	// After 8pm - weeknight
	activity.endTime = dayjs.utc("1970-01-01T20:10").toDate();
	expect(getRateForActivity(activity)).toEqual(["weeknight", 2]);

	// At 8pm - weeknight
	activity.endTime = dayjs.utc("1970-01-01T20:00").toDate();
	expect(getRateForActivity(activity)).toEqual(["weeknight", 2]);

	// 7:30pm weekday - still weekday rate (weeknight starts at 8pm)
	activity.date = new Date("2022-01-14");
	activity.endTime = dayjs.utc("1970-01-01T19:30").toDate();
	expect(getRateForActivity(activity)).toEqual(["weekday", 1]);

	// 7:59pm weekday - still weekday rate
	activity.endTime = dayjs.utc("1970-01-01T19:59").toDate();
	expect(getRateForActivity(activity)).toEqual(["weekday", 1]);

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

test("Should return correct rates", () => {
	const activityWithRates = {
		...baseActivity,
		supportItem: {
			...baseActivity.supportItem,
			supportItemRates: [
				{
					weekdayRate: new Prisma.Decimal(5),
					weeknightRate: new Prisma.Decimal(6),
					saturdayRate: new Prisma.Decimal(7),
					sundayRate: new Prisma.Decimal(8)
				}
			]
		}
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

test("Should return correct total", () => {
	expect(
		getTotalCostOfActivities([getActivity("weekday", "16:00", "17:00", 0, 0)])
	).toEqual(55.47);

	expect(
		getTotalCostOfActivities([getActivity("weekday", "15:00", "17:00", 7, 15)])
	).toEqual(132.26);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "15:00", "17:00", 7, 15),
			getActivity("weekday", "15:00", "21:00", 7, 15)
		])
	).toEqual(520.53);

	expect(
		getTotalCostOfActivities([getActivity("saturday", "15:00", "17:00", 7, 15)])
	).toEqual(179.55);

	expect(
		getTotalCostOfActivities([getActivity("saturday", "19:00", "21:00", 7, 15)])
	).toEqual(179.55);

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
			getActivity("weekday", "09:30", "15:23", 15, 7)
		])
	).toEqual(1008.17);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "09:30", "15:00", 15, 7),
			getActivity("weekday", "09:30", "15:00", 15, 7),
			getActivity("weekday", "09:30", "15:00", 15, 7),
			getActivity("weekday", "09:30", "15:00", 15, 7),
			getActivity("weekday", "09:30", "15:10", 15, 7),
			getActivity("weekday", "09:30", "15:10", 15, 7),
			getActivity("weekday", "09:30", "15:25", 15, 7)
		])
	).toEqual(2322.82);
});

test("Should include activity based transport items in total", () => {
	// DISTANCE solo: km * 0.99
	expect(
		getTotalCostOfActivities([
			{
				...getActivity("weekday", "16:00", "17:00", 0, 0),
				transportItems: [{ type: "DISTANCE" as const, amount: 22 }]
			}
		])
	).toEqual(77.25); // 55.47 + 22 * 0.99

	// DISTANCE group: km * 0.49
	expect(
		getTotalCostOfActivities([
			{
				...getActivity("weekday", "16:00", "17:00", 0, 0, true),
				transportItems: [{ type: "DISTANCE" as const, amount: 22 }]
			}
		])
	).toEqual(66.25); // 55.47 + 22 * 0.49

	// PARKING / TOLL / OTHER are flat amounts
	expect(
		getTotalCostOfActivities([
			{
				...getActivity("weekday", "16:00", "17:00", 0, 0),
				transportItems: [
					{ type: "PARKING" as const, amount: 8.5, note: "Airport parking" },
					{ type: "TOLL" as const, amount: 5.7 },
					{ type: "OTHER" as const, amount: 12, note: null }
				]
			}
		])
	).toEqual(81.67); // 55.47 + 8.50 + 5.70 + 12.00

	// Mixed list of DISTANCE and flat items
	expect(
		getTotalCostOfActivities([
			{
				...getActivity("weekday", "16:00", "17:00", 0, 0),
				transportItems: [
					{ type: "DISTANCE" as const, amount: 10 },
					{ type: "PARKING" as const, amount: 8.5 }
				]
			}
		])
	).toEqual(73.87); // 55.47 + 9.90 + 8.50

	// Prisma.Decimal amounts are converted with Number()
	expect(
		getTotalCostOfActivities([
			{
				...getActivity("weekday", "16:00", "17:00", 0, 0),
				transportItems: [
					{ type: "DISTANCE" as const, amount: new Prisma.Decimal(22) }
				]
			}
		])
	).toEqual(77.25);
});

test("Should use itemDistance when activity has no start/end times", () => {
	// KM rate type: no startTime/endTime, itemDistance * rate
	expect(
		getTotalCostOfActivities([
			{
				date: new Date("2022-01-14"),
				startTime: null,
				endTime: null,
				itemDistance: 34,
				supportItem: {
					...baseActivity.supportItem,
					weekdayRate: new Prisma.Decimal(0.85)
				}
			}
		])
	).toEqual(28.9); // 34 * 0.85
});

test("Should resolve transit rate with correct precedence", () => {
	const activityWithTransit = {
		...getActivity("weekday", "16:00", "17:00", 0, 0),
		transitDistance: new Prisma.Decimal(10)
	};

	// 1. Client transitRatePerKm wins, even when a rateContext is supplied
	expect(
		getTotalCostOfActivities(
			[
				{
					...activityWithTransit,
					client: { transitRatePerKm: new Prisma.Decimal(0.5) }
				}
			],
			{ userTransitRatePerKm: 0.85 }
		)
	).toEqual(60.47); // 55.47 + 10 * 0.50

	// 2. Falls back to rateContext.userTransitRatePerKm
	expect(
		getTotalCostOfActivities([{ ...activityWithTransit, client: null }], {
			userTransitRatePerKm: 0.85
		})
	).toEqual(63.97); // 55.47 + 10 * 0.85

	// 3. Falls back to the 0.99 default
	expect(getTotalCostOfActivities([activityWithTransit])).toEqual(65.37); // 55.47 + 10 * 0.99

	// Quirk (documented, not fixed): a Decimal(0) client rate falls through to
	// the next fallback because of `Number(x) || y`
	expect(
		getTotalCostOfActivities(
			[
				{
					...activityWithTransit,
					client: { transitRatePerKm: new Prisma.Decimal(0) }
				}
			],
			{ userTransitRatePerKm: 0.85 }
		)
	).toEqual(63.97); // falls through to userTransitRatePerKm
});

test("Should return correct total for group activities", () => {
	// Group activities price transit distance at the group rate ($0.43/km),
	// matching the PDF's non-labour travel line items
	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "16:00", "17:00", 0, 0, true)
		])
	).toEqual(55.47);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "15:00", "17:00", 7, 15, true)
		])
	).toEqual(123.86);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "15:00", "17:00", 7, 15, true),
			getActivity("weekday", "15:00", "21:00", 7, 15, true)
		])
	).toEqual(503.73);

	expect(
		getTotalCostOfActivities([
			getActivity("saturday", "15:00", "17:00", 7, 15, true)
		])
	).toEqual(171.15);

	expect(
		getTotalCostOfActivities([
			getActivity("saturday", "19:00", "21:00", 7, 15, true)
		])
	).toEqual(171.15);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "09:30", "15:00", 0, 0, true)
		])
	).toEqual(305.09);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "09:30", "15:10", 0, 0, true)
		])
	).toEqual(314.33);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "16:10", "20:10", 0, 0, true)
		])
	).toEqual(244.2);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "09:30", "15:00", 15, 7, true),
			getActivity("weekday", "09:30", "15:10", 15, 7, true),
			getActivity("weekday", "09:30", "15:23", 15, 7, true)
		])
	).toEqual(996.41);

	expect(
		getTotalCostOfActivities([
			getActivity("weekday", "09:30", "15:00", 15, 7, true),
			getActivity("weekday", "09:30", "15:00", 15, 7, true),
			getActivity("weekday", "09:30", "15:00", 15, 7, true),
			getActivity("weekday", "09:30", "15:00", 15, 7, true),
			getActivity("weekday", "09:30", "15:10", 15, 7, true),
			getActivity("weekday", "09:30", "15:10", 15, 7, true),
			getActivity("weekday", "09:30", "15:25", 15, 7, true)
		])
	).toEqual(2295.38);
});
