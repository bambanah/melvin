import { billableLines } from "@/lib/billing-lines";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { round } from "@/lib/generic-utils";
import { invoiceFixtures } from "@/lib/testing/invoice-fixtures";
import { Prisma, RateType } from "@/generated/client";
import { expect, test } from "vitest";

const baseSupportItem = {
	description: "Support Item",
	weekdayCode: "04_104_0125_6_1",
	weekdayRate: new Prisma.Decimal(55.47),
	weeknightCode: "04_103_0125_6_1",
	weeknightRate: new Prisma.Decimal(61.05),
	saturdayCode: "04_105_0125_6_1",
	saturdayRate: new Prisma.Decimal(77.81),
	sundayCode: "04_106_0125_6_1",
	sundayRate: new Prisma.Decimal(100.16),
	rateType: RateType.HOUR,
	isGroup: false
};

const fullyLoadedActivity = {
	id: "activity_1",
	date: new Date("2022-01-14"), // weekday
	startTime: new Date("1970-01-01T09:00:00.000Z"),
	endTime: new Date("1970-01-01T11:00:00.000Z"),
	transitDuration: new Prisma.Decimal(30),
	transitDistance: new Prisma.Decimal(15),
	transportItems: [
		{ type: "DISTANCE" as const, amount: new Prisma.Decimal(10) },
		{
			type: "PARKING" as const,
			amount: new Prisma.Decimal(8.5),
			note: "Airport parking"
		}
	],
	supportItem: baseSupportItem
};

test("produces one line per category for a fully-loaded activity", () => {
	const lines = billableLines(fullyLoadedActivity);

	expect(lines.map((line) => line.kind)).toEqual([
		"SUPPORT",
		"TRAVEL_TIME",
		"TRAVEL_KM",
		"ABT",
		"EXPENSE"
	]);
});

test("group activity's ABT DISTANCE lines at 0.49/km", () => {
	const lines = billableLines({
		...fullyLoadedActivity,
		transitDuration: null,
		transitDistance: null,
		supportItem: { ...baseSupportItem, isGroup: true }
	});

	const abtLine = lines.find((line) => line.kind === "ABT");
	expect(abtLine?.unitPrice).toEqual(0.49);
	expect(abtLine?.total).toEqual(round(10 * 0.49, 2));
});

test("group activity's TRAVEL_KM line bills at the group rate (0.43/km), via getTransitRate", () => {
	const lines = billableLines({
		...fullyLoadedActivity,
		transportItems: [],
		supportItem: { ...baseSupportItem, isGroup: true }
	});

	const travelKmLine = lines.find((line) => line.kind === "TRAVEL_KM");
	expect(travelKmLine?.unitPrice).toEqual(0.43);
	expect(travelKmLine?.total).toEqual(round(15 * 0.43, 2));
});

test("solo activity's TRAVEL_KM line resolves the plan-006 effective rate (client → user → 0.99)", () => {
	const solo = { ...fullyLoadedActivity, transportItems: [] };

	// Client override wins
	expect(
		billableLines(
			{ ...solo, client: { transitRatePerKm: new Prisma.Decimal(0.5) } },
			{ userTransitRatePerKm: 0.85 }
		).find((line) => line.kind === "TRAVEL_KM")?.unitPrice
	).toEqual(0.5);

	// Falls back to the user's rate
	expect(
		billableLines(solo, { userTransitRatePerKm: 0.85 }).find(
			(line) => line.kind === "TRAVEL_KM"
		)?.unitPrice
	).toEqual(0.85);

	// Falls back to the 0.99 default
	expect(
		billableLines(solo).find((line) => line.kind === "TRAVEL_KM")?.unitPrice
	).toEqual(0.99);
});

test("EXPENSE lines (PARKING/TOLL/OTHER) bill at face value", () => {
	const lines = billableLines({
		...fullyLoadedActivity,
		transitDuration: null,
		transitDistance: null,
		transportItems: [
			{
				type: "TOLL" as const,
				amount: new Prisma.Decimal(5.7),
				note: "CityLink"
			}
		]
	});

	const expenseLine = lines.find((line) => line.kind === "EXPENSE");
	expect(expenseLine?.unitPrice).toEqual(5.7);
	expect(expenseLine?.total).toEqual(5.7);
	expect(expenseLine?.transportType).toEqual("TOLL");
	expect(expenseLine?.note).toEqual("CityLink");
});

test("sum of every activity's line totals equals getTotalCostOfActivities, for every invoice fixture", () => {
	for (const fixture of invoiceFixtures) {
		const rateContext = {
			userTransitRatePerKm: Number(fixture.user.transitRatePerKm ?? 0.99)
		};

		const lineTotal = round(
			fixture.invoice.activities
				.flatMap((activity) => billableLines(activity, rateContext))
				.reduce((total, line) => total + line.total, 0),
			2
		);

		expect(lineTotal).toEqual(
			getTotalCostOfActivities(fixture.invoice.activities, rateContext)
		);
	}
});
