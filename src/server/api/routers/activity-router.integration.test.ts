import { Prisma } from "@/generated/client";
import prisma from "@/server/prisma";
import superjson from "superjson";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "../test/harness";

beforeEach(async () => {
	await resetDb();
});

async function createSupportItem(ownerId: string) {
	return prisma.supportItem.create({
		data: {
			description: "Standard Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 100,
			ownerId
		}
	});
}

// These are characterization tests: they pin the wire shape `activity.list`
// returns today (cursor contract + Decimal serialization) so the better-auth
// migration (#418), which reworks context/session, can't silently drift it.

test("activity.list cursor advances across pages without overlap or gaps", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const client = await caller.clients.create({ client: { name: "Jane" } });
	const supportItem = await createSupportItem(user.id);

	// Three activities on distinct dates; list orders date desc, so the stable
	// order is 03, 02, 01.
	const byDate: Record<string, string> = {};
	for (const day of ["2024-01-01", "2024-01-02", "2024-01-03"]) {
		const created = await caller.activity.add({
			activity: {
				clientId: client.id,
				supportItemId: supportItem.id,
				date: new Date(day),
				startTime: "09:00",
				endTime: "10:00",
				itemDistance: 0
			}
		});
		byDate[day] = created.id;
	}
	const expectedOrder = [
		byDate["2024-01-03"],
		byDate["2024-01-02"],
		byDate["2024-01-01"]
	];

	const page1 = await caller.activity.list({ limit: 2 });
	expect(page1.activities).toHaveLength(2);
	expect(page1.nextCursor).toBeTypeOf("string");

	const page2 = await caller.activity.list({
		limit: 2,
		cursor: page1.nextCursor
	});
	expect(page2.activities).toHaveLength(1);
	expect(page2.nextCursor).toBeUndefined();

	// The two pages, concatenated, must equal the full seeded set in order: no
	// overlap (a repeated row would break the equality) and no gaps (a dropped
	// row would too). Oracle is the known seeding order, not another list() call.
	const ids = [...page1.activities, ...page2.activities].map((a) => a.id);
	expect(ids).toEqual(expectedOrder);
});

test("activity.list serializes Decimal fields in the current on-the-wire shape", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const client = await caller.clients.create({ client: { name: "Jane" } });
	const supportItem = await createSupportItem(user.id);

	await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0,
			transitDistance: "12.5"
		}
	});

	const { activities } = await caller.activity.list({ limit: 10 });
	const [activity] = activities;

	// The caller returns a Prisma.Decimal instance...
	expect(activity.transitDistance).toBeInstanceOf(Prisma.Decimal);
	expect(activity.transitDistance?.toString()).toBe("12.5");

	// ...and superjson.stringify - exactly what the tRPC transformer puts on the
	// wire - renders the row's Decimal as a plain JSON string with no type tag,
	// unlike the Date fields beside it, which carry a `["Date"]` tag in
	// meta.values. This pins the on-the-wire shape of the row; a regression that
	// boxed or re-typed the Decimal breaks here.
	const wire = JSON.parse(superjson.stringify(activity));
	expect(wire.json.transitDistance).toBe("12.5");
	expect(wire.meta?.values ?? {}).not.toHaveProperty("transitDistance");
	expect(wire.meta?.values).toHaveProperty("date");
});
