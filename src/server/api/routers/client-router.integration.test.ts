import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "../test/harness";

beforeEach(async () => {
	await resetDb();
});

test("clients.list defaults to active-only, with an opt-in to include inactive", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const active = await caller.clients.create({
		client: { name: "Active Client" }
	});
	const inactive = await caller.clients.create({
		client: { name: "Inactive Client" }
	});
	await caller.clients.update({
		id: inactive.id,
		client: { name: inactive.name, active: false }
	});

	const defaultList = await caller.clients.list({});
	expect(defaultList.clients.map((c) => c.id)).toEqual([active.id]);

	const fullList = await caller.clients.list({ includeInactive: true });
	expect(fullList.clients.map((c) => c.id).sort()).toEqual(
		[active.id, inactive.id].sort()
	);
});

test("clients.update can reactivate a deactivated client", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const client = await caller.clients.create({
		client: { name: "Some Client" }
	});
	await caller.clients.update({
		id: client.id,
		client: { name: client.name, active: false }
	});

	let byId = await caller.clients.byId({ id: client.id });
	expect(byId.active).toBe(false);

	await caller.clients.update({
		id: client.id,
		client: { name: client.name, active: true }
	});

	byId = await caller.clients.byId({ id: client.id });
	expect(byId.active).toBe(true);
});

test("new clients default to active", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const client = await caller.clients.create({
		client: { name: "Fresh Client" }
	});

	expect(client.active).toBe(true);
});
