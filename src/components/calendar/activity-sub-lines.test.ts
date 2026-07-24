import { activitySubLines } from "@/components/calendar/activity-sub-lines";
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
	transitDuration: new Prisma.Decimal(25),
	transitDistance: new Prisma.Decimal(18),
	transportItems: [
		{ type: "DISTANCE" as const, amount: new Prisma.Decimal(14) },
		{
			type: "PARKING" as const,
			amount: new Prisma.Decimal(8.5),
			note: "hospital carpark"
		}
	],
	supportItem: baseSupportItem
};

test("splits Provider Travel from Activity Based Transport as quantities-only", () => {
	const { travel, transport } = activitySubLines(fullyLoadedActivity);

	// Provider Travel: labour minutes then non-labour km.
	expect(travel).toEqual(["25 minutes", "18 km"]);

	// Activity Based Transport: ABT km then the parking expense with its note.
	expect(transport).toEqual(["14 km", "Parking - hospital carpark"]);
});

test("renders nothing when an activity has no travel or transport", () => {
	const { travel, transport } = activitySubLines({
		...fullyLoadedActivity,
		transitDuration: null,
		transitDistance: null,
		transportItems: []
	});

	expect(travel).toEqual([]);
	expect(transport).toEqual([]);
});

test("group activities show unapportioned quantities (money is apportioned, not the qty)", () => {
	const { travel, transport } = activitySubLines({
		...fullyLoadedActivity,
		supportItem: { ...baseSupportItem, isGroup: true },
		groupSize: 3
	});

	// Quantities are the raw figures the provider checks against their notes —
	// group apportionment only affects the dollar total on the parent row.
	expect(travel).toEqual(["25 minutes", "18 km"]);
	expect(transport).toEqual(["14 km", "Parking - hospital carpark"]);
});

test("omits zero-value transport expenses, matching the invoice", () => {
	const { transport } = activitySubLines({
		...fullyLoadedActivity,
		transportItems: [
			{ type: "DISTANCE" as const, amount: new Prisma.Decimal(0) },
			{
				type: "TOLL" as const,
				amount: new Prisma.Decimal(4.2),
				note: null
			}
		]
	});

	expect(transport).toEqual(["Toll"]);
});
