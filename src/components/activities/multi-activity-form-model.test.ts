import { stripTimezone } from "@/lib/date-utils";
import { describe, expect, it } from "vitest";
import {
	buildBulkAddPayload,
	createEmptyRow,
	multiActivityFormSchema,
	type ActivityRowModel
} from "./multi-activity-form-model";

const DATE = new Date("2026-07-20T00:00:00Z");
const DEFAULTS = {
	defaultSupportItemId: "default-item",
	defaultGroupSupportItemId: "group-item"
};

function row(overrides: Partial<ActivityRowModel> = {}): ActivityRowModel {
	return {
		...createEmptyRow(),
		clientId: "client-1",
		timeRange: { startTime: "09:00", endTime: "10:00" },
		...overrides
	};
}

describe("buildBulkAddPayload", () => {
	it("drops empty rows", () => {
		const payload = buildBulkAddPayload(
			[createEmptyRow(), row(), createEmptyRow()],
			DATE,
			DEFAULTS
		);

		expect(payload.activities).toHaveLength(1);
		expect(payload.activities[0].clientId).toBe("client-1");
	});

	it("returns no activities and autoCreateTrip when every row is empty", () => {
		const payload = buildBulkAddPayload([createEmptyRow()], DATE, DEFAULTS);

		expect(payload).toEqual({ activities: [], autoCreateTrip: true });
	});

	it("builds a single non-group activity with the default support item", () => {
		const payload = buildBulkAddPayload([row()], DATE, DEFAULTS);

		expect(payload).toEqual({
			activities: [
				{
					clientId: "client-1",
					date: stripTimezone(DATE),
					startTime: "09:00",
					endTime: "10:00",
					supportItemId: "default-item",
					groupSize: undefined,
					transportItems: undefined
				}
			],
			autoCreateTrip: true
		});
	});

	it("prepends a DISTANCE item for transportKm and keeps only positive extras", () => {
		const payload = buildBulkAddPayload(
			[
				row({
					transportKm: 12,
					transportItems: [
						{ type: "PARKING", amount: 5, note: "" },
						{ type: "TOLL", amount: 0, note: "" }
					]
				})
			],
			DATE,
			DEFAULTS
		);

		expect(payload.activities[0].transportItems).toEqual([
			{ type: "DISTANCE", amount: 12 },
			{ type: "PARKING", amount: 5, note: "" }
		]);
	});

	it("expands a group row into primary + participants and disables autoCreateTrip", () => {
		const payload = buildBulkAddPayload(
			[
				row({
					isGroup: true,
					groupClientIds: ["client-2", "client-3"],
					transportKm: 8
				})
			],
			DATE,
			DEFAULTS
		);

		expect(payload.autoCreateTrip).toBe(false);
		expect(payload.activities).toHaveLength(3);

		// Primary carries transport + group support item + groupSize (2 others + 1)
		expect(payload.activities[0]).toMatchObject({
			clientId: "client-1",
			supportItemId: "group-item",
			groupSize: 3,
			transportItems: [{ type: "DISTANCE", amount: 8 }]
		});

		// Participants share support item + groupSize but carry no transport
		expect(payload.activities[1]).toEqual({
			clientId: "client-2",
			date: stripTimezone(DATE),
			startTime: "09:00",
			endTime: "10:00",
			supportItemId: "group-item",
			groupSize: 3
		});
		expect(payload.activities[2].clientId).toBe("client-3");
		expect(payload.activities[2].transportItems).toBeUndefined();
	});

	it("leaves groupSize unset for a group toggle with no participants", () => {
		const payload = buildBulkAddPayload(
			[row({ isGroup: true, groupClientIds: [] })],
			DATE,
			DEFAULTS
		);

		expect(payload.activities).toHaveLength(1);
		expect(payload.activities[0].groupSize).toBeUndefined();
		// No group participants means the trip can still auto-create
		expect(payload.autoCreateTrip).toBe(true);
	});
});

describe("multiActivityFormSchema validation", () => {
	function validate(rows: ActivityRowModel[]) {
		return multiActivityFormSchema.safeParse({ date: DATE, activities: rows });
	}

	it("accepts a form of only empty rows (nothing to validate yet)", () => {
		expect(validate([createEmptyRow()]).success).toBe(true);
	});

	it("accepts a fully valid row", () => {
		expect(validate([row()]).success).toBe(true);
	});

	it("flags a non-empty row missing its client", () => {
		const result = validate([row({ clientId: "" })]);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			result.error.issues.some(
				(i) => i.path.join(".") === "activities.0.clientId"
			)
		).toBe(true);
	});

	it("derives the end-before-start rule from activitySchema", () => {
		const result = validate([
			row({ timeRange: { startTime: "13:00", endTime: "09:00" } })
		]);
		expect(result.success).toBe(false);
		if (result.success) return;
		const timeIssue = result.error.issues.find(
			(i) => i.path.join(".") === "activities.0.timeRange"
		);
		expect(timeIssue?.message).toContain("End time must be after start time");
	});

	it("rejects equal start and end times", () => {
		const result = validate([
			row({ timeRange: { startTime: "09:00", endTime: "09:00" } })
		]);
		expect(result.success).toBe(false);
	});

	it("requires at least one participant on a group row", () => {
		const result = validate([row({ isGroup: true, groupClientIds: [] })]);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			result.error.issues.some(
				(i) => i.path.join(".") === "activities.0.groupClientIds"
			)
		).toBe(true);
	});

	it("blocks submit when any of several rows is invalid", () => {
		const result = validate([
			row(),
			row({ timeRange: { startTime: "13:00", endTime: "09:00" } })
		]);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			result.error.issues.some(
				(i) => i.path.join(".") === "activities.1.timeRange"
			)
		).toBe(true);
	});
});
