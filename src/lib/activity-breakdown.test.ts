import { describe, expect, test } from "vitest";

import { activityBreakdownRows } from "./activity-breakdown";
import { getTotalCostOfActivities } from "./activity-utils";
import type { BillableActivity } from "./billing-lines";

// A weekday (2026-07-20 is a Monday) so the weekday code/rate resolves.
const WEEKDAY = new Date("2026-07-20T00:00:00.000Z");

const hourlySupportItem: BillableActivity["supportItem"] = {
	description: "Daily Personal Activities",
	rateType: "HOUR",
	isGroup: false,
	weekdayCode: "01_011_0107_1_1",
	weeknightCode: "01_015_0107_1_1",
	saturdayCode: "01_013_0107_1_1",
	sundayCode: "01_014_0107_1_1",
	weekdayRate: 70 as unknown as never,
	weeknightRate: 80 as unknown as never,
	saturdayRate: 90 as unknown as never,
	sundayRate: 100 as unknown as never
};

function hourlyActivity(
	overrides: Partial<BillableActivity> = {}
): BillableActivity {
	return {
		id: "act-1",
		date: WEEKDAY,
		startTime: new Date("2026-07-20T09:00:00.000Z"),
		endTime: new Date("2026-07-20T11:00:00.000Z"),
		supportItem: hourlySupportItem,
		client: { transitRatePerKm: null },
		...overrides
	};
}

describe("activityBreakdownRows", () => {
	test("maps a plain hourly support line", () => {
		const rows = activityBreakdownRows(hourlyActivity());

		expect(rows).toHaveLength(1);
		const [support] = rows;
		expect(support.kind).toBe("SUPPORT");
		expect(support.supportItemCode).toBe("01_011_0107_1_1");
		expect(support.unitPrice).toBe(70);
		expect(support.unitPriceSuffix).toBe("hr");
		expect(support.total).toBe(140);
		expect(support.detailsText).toContain("09:00-11:00");
		expect(support.apportionment).toBeUndefined();
	});

	test("emits provider-travel labour and non-labour lines", () => {
		const rows = activityBreakdownRows(
			hourlyActivity({
				transitDuration: 20 as unknown as never,
				transitDistance: 10 as unknown as never
			}),
			{ userTransitRatePerKm: 0.99 }
		);

		const kinds = rows.map((r) => r.kind);
		expect(kinds).toEqual(["SUPPORT", "TRAVEL_TIME", "TRAVEL_KM"]);

		const travelTime = rows.find((r) => r.kind === "TRAVEL_TIME")!;
		expect(travelTime.detailsText).toBe("20 minutes");

		const travelKm = rows.find((r) => r.kind === "TRAVEL_KM")!;
		expect(travelKm.unitPrice).toBeCloseTo(0.99);
		expect(travelKm.unitPriceSuffix).toBe("km");
	});

	test("splits apportioned lines for a group activity", () => {
		const rows = activityBreakdownRows(
			hourlyActivity({
				groupSize: 4,
				transitDistance: 10 as unknown as never,
				supportItem: { ...hourlySupportItem, isGroup: true }
			})
		);

		const support = rows.find((r) => r.kind === "SUPPORT")!;
		expect(support.apportionment).toEqual({
			baseUnitPrice: 70,
			groupSize: 4,
			apportionedUnitPrice: 17.5
		});
		// The line's own unit price reflects the apportioned figure.
		expect(support.unitPrice).toBe(17.5);

		const travelKm = rows.find((r) => r.kind === "TRAVEL_KM")!;
		expect(travelKm.apportionment?.groupSize).toBe(4);
	});

	test("expense lines are never apportioned", () => {
		const rows = activityBreakdownRows(
			hourlyActivity({
				groupSize: 4,
				supportItem: { ...hourlySupportItem, isGroup: true },
				transportItems: [{ type: "PARKING", amount: 12, note: "Meter" }]
			})
		);

		const expense = rows.find((r) => r.kind === "EXPENSE")!;
		expect(expense.total).toBe(12);
		expect(expense.apportionment).toBeUndefined();
		expect(expense.detailsText).toBe("Parking - Meter");
	});

	test("row totals sum to the canonical activity total (no second costing path)", () => {
		const activity = hourlyActivity({
			transitDuration: 25 as unknown as never,
			transitDistance: 14 as unknown as never,
			transportItems: [
				{ type: "DISTANCE", amount: 8 },
				{ type: "TOLL", amount: 4.5 }
			]
		});
		const rateContext = { userTransitRatePerKm: 0.85 };

		const rowsTotal = activityBreakdownRows(activity, rateContext).reduce(
			(sum, row) => sum + row.total,
			0
		);

		expect(rowsTotal).toBeCloseTo(
			getTotalCostOfActivities([activity], rateContext, { forDisplay: true })
		);
	});
});
