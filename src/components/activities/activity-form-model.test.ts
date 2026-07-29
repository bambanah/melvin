import { describe, expect, it } from "vitest";
import {
	activityFormDefaults,
	hydrateTransportItems,
	mergeTransportItems,
	otherTransportItems,
	standaloneTravelDefaults,
	toActivityPayload
} from "./activity-form-model";

// The wire shape: Prisma Decimals arrive as strings, times as UTC-anchored Dates.
const EXISTING = {
	date: new Date("2026-07-20T00:00:00Z"),
	client: { id: "client-1" },
	supportItem: { id: "item-1" },
	startTime: new Date("1970-01-01T09:30:00Z"),
	endTime: new Date("1970-01-01T11:00:00Z"),
	itemDistance: null,
	transitDistance: "12.5",
	transitDuration: "20",
	groupSize: 3,
	transportItems: [
		{ type: "DISTANCE" as const, amount: "8.4" },
		{ type: "PARKING" as const, amount: "6.5", note: "carpark" }
	]
};

describe("activityFormDefaults", () => {
	it("loads every saved field of an existing activity", () => {
		expect(activityFormDefaults(EXISTING)).toEqual({
			date: EXISTING.date,
			clientId: "client-1",
			supportItemId: "item-1",
			startTime: "09:30",
			endTime: "11:00",
			itemDistance: undefined,
			transitDistance: "12.5",
			transitDuration: "20",
			groupSize: 3,
			transportItems: [
				{ type: "DISTANCE", amount: 8.4 },
				{ type: "PARKING", amount: 6.5, note: "carpark" }
			]
		});
	});

	it("keeps a zero transit distance rather than reading it as absent", () => {
		const defaults = activityFormDefaults({
			...EXISTING,
			transitDistance: "0"
		});

		expect(defaults.transitDistance).toBe("0");
	});

	it("starts a new activity empty, with today's date and a zero km row", () => {
		const defaults = activityFormDefaults();

		expect(defaults.clientId).toBe("");
		expect(defaults.supportItemId).toBe("");
		expect(defaults.startTime).toBe("");
		expect(defaults.transitDistance).toBe("");
		expect(defaults.groupSize).toBeUndefined();
		expect(defaults.transportItems).toEqual([{ type: "DISTANCE", amount: 0 }]);
	});
});

describe("standaloneTravelDefaults", () => {
	it("prefills the return trip, not one leg of it", () => {
		expect(
			standaloneTravelDefaults({
				distanceToClient: "12.5",
				travelTimeToClient: "20"
			})
		).toEqual({ transitDistance: "25", transitDuration: "40" });
	});

	it("caps each leg's minutes at the travel time cap", () => {
		expect(
			standaloneTravelDefaults({
				distanceToClient: "40",
				travelTimeToClient: "45"
			})
		).toEqual({ transitDistance: "80", transitDuration: "60" });
	});

	it("leaves a field blank when the client has no stored value", () => {
		expect(
			standaloneTravelDefaults({
				distanceToClient: null,
				travelTimeToClient: "20"
			})
		).toEqual({ transitDistance: "", transitDuration: "40" });

		expect(standaloneTravelDefaults(null)).toEqual({
			transitDistance: "",
			transitDuration: ""
		});
	});
});

describe("hydrateTransportItems", () => {
	it("puts a zero km row first when there is no stored transport", () => {
		expect(hydrateTransportItems()).toEqual([{ type: "DISTANCE", amount: 0 }]);
		expect(hydrateTransportItems([])).toEqual([
			{ type: "DISTANCE", amount: 0 }
		]);
	});

	it("sums multiple stored distance rows into the single km field", () => {
		expect(
			hydrateTransportItems([
				{ type: "DISTANCE", amount: "5" },
				{ type: "TOLL", amount: "4" },
				{ type: "DISTANCE", amount: "2.5" }
			])
		).toEqual([
			{ type: "DISTANCE", amount: 7.5 },
			{ type: "TOLL", amount: 4, note: undefined }
		]);
	});
});

describe("otherTransportItems / mergeTransportItems", () => {
	const hydrated = hydrateTransportItems(EXISTING.transportItems);

	it("exposes only the non-distance rows to the editor", () => {
		expect(otherTransportItems(hydrated)).toEqual([
			{ type: "PARKING", amount: 6.5, note: "carpark" }
		]);
	});

	it("keeps the km row at index 0 when the editor writes back", () => {
		const merged = mergeTransportItems(hydrated, [{ type: "TOLL", amount: 3 }]);

		expect(merged).toEqual([
			{ type: "DISTANCE", amount: 8.4 },
			{ type: "TOLL", amount: 3 }
		]);
	});

	it("keeps a km row at index 0 even with nothing to merge into", () => {
		expect(mergeTransportItems(undefined, [])).toEqual([
			{ type: "DISTANCE", amount: 0 }
		]);
	});
});

describe("toActivityPayload", () => {
	const values = activityFormDefaults(EXISTING);

	it("round-trips the transport, transit and group fields of an hourly item", () => {
		const payload = toActivityPayload(values, "HOUR");

		expect(payload).toMatchObject({
			startTime: "09:30",
			endTime: "11:00",
			itemDistance: undefined,
			transitDistance: "12.5",
			transitDuration: "20",
			groupSize: 3,
			transportItems: [
				{ type: "DISTANCE", amount: 8.4 },
				{ type: "PARKING", amount: 6.5, note: "carpark" }
			]
		});
	});

	it("bills a per-km item by its own distance, not its time span", () => {
		const payload = toActivityPayload({ ...values, itemDistance: 40 }, "KM");

		expect(payload.startTime).toBeUndefined();
		expect(payload.endTime).toBeUndefined();
		expect(payload.itemDistance).toBe(40);
	});

	it("drops zero-amount transport rows", () => {
		const payload = toActivityPayload(
			{
				...values,
				transportItems: [
					{ type: "DISTANCE", amount: 0 },
					{ type: "PARKING", amount: 0 },
					{ type: "TOLL", amount: 2 }
				]
			},
			"HOUR"
		);

		expect(payload.transportItems).toEqual([{ type: "TOLL", amount: 2 }]);
	});

	it("sends an empty list when the activity's transport is cleared", () => {
		const payload = toActivityPayload(
			{ ...values, transportItems: [{ type: "DISTANCE", amount: 0 }] },
			"HOUR"
		);

		expect(payload.transportItems).toEqual([]);
	});
});
