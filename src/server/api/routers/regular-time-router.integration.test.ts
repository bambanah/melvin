import { utcDate } from "@/lib/date-utils";
import prisma from "@/server/prisma";
import { format } from "date-fns";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "../test/harness";

beforeEach(async () => {
	await resetDb();
});

function createSupportItem(
	ownerId: string,
	data: { rateType?: "HOUR" | "KM"; isGroup?: boolean } = {}
) {
	return prisma.supportItem.create({
		data: {
			description: "Standard Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 100,
			ownerId,
			...data
		}
	});
}

async function setUp() {
	const user = await createTestUser();
	const caller = callerFor(user);
	const client = await caller.clients.create({
		client: { name: "Jane", distanceToClient: "12", travelTimeToClient: "20" }
	});
	const supportItem = await createSupportItem(user.id);
	return { user, caller, client, supportItem };
}

test("a Client's Regular Time is set, read back on the Client, and cleared", async () => {
	const { caller, client, supportItem } = await setUp();

	await caller.regularTime.set({
		clientId: client.id,
		regularTime: {
			startTime: "14:35",
			endTime: "16:35",
			supportItemId: supportItem.id,
			claimsTravel: false
		}
	});

	const { regularTime } = await caller.clients.byId({ id: client.id });
	expect(regularTime).toMatchObject({
		supportItem: { id: supportItem.id },
		claimsTravel: false
	});
	expect(format(utcDate(regularTime!.startTime), "HH:mm")).toBe("14:35");
	expect(format(utcDate(regularTime!.endTime), "HH:mm")).toBe("16:35");

	await caller.regularTime.clear({ clientId: client.id });
	expect((await caller.clients.byId({ id: client.id })).regularTime).toBeNull();
});

test("a Regular Time takes only the Provider's own solo, hourly Support Items", async () => {
	const { user, caller, client } = await setUp();
	const other = await createTestUser();

	const set = (supportItemId: string) =>
		caller.regularTime.set({
			clientId: client.id,
			regularTime: {
				startTime: "09:00",
				endTime: "10:00",
				supportItemId,
				claimsTravel: false
			}
		});

	const group = await createSupportItem(user.id, { isGroup: true });
	const perKm = await createSupportItem(user.id, { rateType: "KM" });
	const notMine = await createSupportItem(other.id);

	await expect(set(group.id)).rejects.toThrow(/solo, hourly/);
	await expect(set(perKm.id)).rejects.toThrow(/solo, hourly/);
	await expect(set(notMine.id)).rejects.toThrow();
	expect((await caller.clients.byId({ id: client.id })).regularTime).toBeNull();
});

test("a Regular Time must end after it starts", async () => {
	const { caller, client, supportItem } = await setUp();

	await expect(
		caller.regularTime.set({
			clientId: client.id,
			regularTime: {
				startTime: "16:35",
				endTime: "14:35",
				supportItemId: supportItem.id,
				claimsTravel: false
			}
		})
	).rejects.toThrow(/End time must be after start time/);
});

async function setRegularTime(
	caller: Awaited<ReturnType<typeof setUp>>["caller"],
	clientId: string,
	supportItemId: string,
	claimsTravel: boolean
) {
	await caller.regularTime.set({
		clientId,
		regularTime: {
			startTime: "14:35",
			endTime: "16:35",
			supportItemId,
			claimsTravel
		}
	});
}

const listed = async (caller: Awaited<ReturnType<typeof setUp>>["caller"]) =>
	(await caller.activity.list({ assigned: false })).activities
		.map((activity) => ({
			date: format(utcDate(activity.date), "yyyy-MM-dd"),
			startTime: format(utcDate(activity.startTime!), "HH:mm"),
			endTime: format(utcDate(activity.endTime!), "HH:mm"),
			supportItemId: activity.supportItem.id,
			transitDistance: activity.transitDistance?.toString() ?? null,
			transitDuration: activity.transitDuration?.toString() ?? null,
			tripId: activity.tripId
		}))
		.sort((a, b) => a.date.localeCompare(b.date));

test("applying a Regular Time without travel creates one Pending Activity per date, with no Provider Travel", async () => {
	const { caller, client, supportItem } = await setUp();
	await setRegularTime(caller, client.id, supportItem.id, false);

	await caller.regularTime.applyToDates({
		clientId: client.id,
		dates: [new Date("2024-03-04"), new Date("2024-03-11")]
	});

	const shape = {
		startTime: "14:35",
		endTime: "16:35",
		supportItemId: supportItem.id,
		transitDistance: null,
		transitDuration: null,
		tripId: null
	};
	expect(await listed(caller)).toEqual([
		{ date: "2024-03-04", ...shape },
		{ date: "2024-03-11", ...shape }
	]);
});

test("applying a Regular Time that claims travel bills each Activity the standalone return trip, never a Trip", async () => {
	const { caller, client, supportItem } = await setUp();
	await setRegularTime(caller, client.id, supportItem.id, true);

	// Two dates applied together are still two separate days of travel.
	await caller.regularTime.applyToDates({
		clientId: client.id,
		dates: [new Date("2024-03-04"), new Date("2024-03-11")]
	});

	const activities = await listed(caller);
	expect(activities).toHaveLength(2);
	for (const activity of activities) {
		// 12 km and 20 min each way.
		expect(activity).toMatchObject({
			transitDistance: "24",
			transitDuration: "40",
			tripId: null
		});
	}
});

test("a Regular Time applies to today but never to a future date", async () => {
	const { caller, client, supportItem } = await setUp();
	await setRegularTime(caller, client.id, supportItem.id, false);

	const today = new Date(
		`${format(utcDate(new Date()), "yyyy-MM-dd")}T00:00:00Z`
	);
	const inTwoDays = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

	await expect(
		caller.regularTime.applyToDates({
			clientId: client.id,
			dates: [today, inTwoDays]
		})
	).rejects.toThrow(/future/);
	expect(await listed(caller)).toEqual([]);

	await caller.regularTime.applyToDates({
		clientId: client.id,
		dates: [today]
	});
	expect(await listed(caller)).toHaveLength(1);
});

test("datesWithActivity names the candidate dates that already hold an Activity for that Client", async () => {
	const { caller, client, supportItem } = await setUp();
	const otherClient = await caller.clients.create({ client: { name: "Sam" } });

	const addOn = (clientId: string, date: string) =>
		caller.activity.add({
			activity: {
				clientId,
				supportItemId: supportItem.id,
				date: new Date(date),
				startTime: "09:00",
				endTime: "10:00"
			}
		});
	await addOn(client.id, "2024-03-04");
	await addOn(otherClient.id, "2024-03-05");
	await addOn(client.id, "2024-03-20");

	const dates = await caller.regularTime.datesWithActivity({
		clientId: client.id,
		dates: ["2024-03-04", "2024-03-05", "2024-03-06"].map((d) => new Date(d))
	});

	expect(dates).toEqual(["2024-03-04"]);
});

test("list offers only active Clients that have a Regular Time", async () => {
	const { caller, client, supportItem } = await setUp();
	const inactive = await caller.clients.create({ client: { name: "Former" } });
	await caller.clients.create({ client: { name: "Irregular" } });

	await setRegularTime(caller, client.id, supportItem.id, true);
	await setRegularTime(caller, inactive.id, supportItem.id, false);
	await caller.clients.update({
		id: inactive.id,
		client: { name: inactive.name, active: false }
	});

	const list = await caller.regularTime.list();

	expect(list).toHaveLength(1);
	expect(list[0]).toMatchObject({
		clientId: client.id,
		client: { name: "Jane" },
		claimsTravel: true
	});
	expect(format(utcDate(list[0].startTime), "HH:mm")).toBe("14:35");
});
