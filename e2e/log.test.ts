import prisma from "@/server/prisma";
import { expect, test, type Page } from "@playwright/test";
import { format, subDays } from "date-fns";
import {
	createDefaultSupportItem,
	createRandomClient,
	createSignInableUser,
	signIn
} from "./test-utils";

/** A Client's section of the Log, located by its heading. */
const logSection = (page: Page, clientName: string) =>
	page
		.locator("[data-slot=log-client-section]")
		.filter({ has: page.getByRole("heading", { name: clientName }) });

/** The stack of days waiting to promote, which summarises Sessions too. */
const promoteStack = (page: Page) =>
	page.locator("section").filter({
		has: page.getByRole("heading", { name: "Waiting to promote" })
	});

// The Log is per-Provider global state: an Open Session puts a banner on
// every dashboard screen, and only one can be open at a time. Running these
// tests as the shared testUser would leak that banner into unrelated e2e
// files running in parallel - so this file gets its own authenticated user.
const logUser = {
	id: "log-e2e-user",
	name: "Log Test User",
	email: "log-e2e@user.com"
};

test.beforeAll(async () => {
	await prisma.user.deleteMany({ where: { email: logUser.email } });
	await createSignInableUser(logUser);
});

test.afterAll(async () => {
	await prisma.user.deleteMany({ where: { email: logUser.email } });
});

test.beforeEach(async ({ page, baseURL }) => {
	// Sign in as logUser, replacing the storage-state session testUser's
	// cookie carries into this context.
	await signIn(page, logUser.email, baseURL!);
	// One Open Session per Provider - start each test from an empty Log.
	await prisma.workSession.deleteMany({ where: { ownerId: logUser.id } });
});

test("Captures a day of sessions and promotes it to Activities and a Trip", async ({
	page
}) => {
	const clientA = await createRandomClient(logUser.id);
	const clientB = await createRandomClient(logUser.id);
	await createDefaultSupportItem(logUser.id);

	await page.goto("/dashboard/log");

	// Start the day with client A.
	await page.getByRole("button", { name: "Start a Session" }).click();
	await page.getByRole("checkbox", { name: clientA.name }).click();
	await page.getByLabel("Started at").fill("09:00");
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await expect(page.getByText("Session in progress")).toBeVisible();

	// Drive the client around during the Session - Activity Based Transport.
	await page.getByRole("button", { name: /\+ Trip km/ }).click();
	await page.getByLabel("Drove (km)").fill("8");
	await page.getByRole("button", { name: "Log trip" }).click();
	await expect(page.getByText("8 km logged")).toBeVisible();

	// End for A, with more clients to come.
	await page.getByRole("button", { name: "End Session" }).click();
	await page.getByLabel("Finished at").fill("10:00");
	await page.getByRole("button", { name: "More clients to come" }).click();

	// "More clients to come" chains straight into the Start flow - no extra
	// navigation - and starting the next client captures the drive between
	// them: the gap (10:00 → 10:20) pre-fills the travel duration.
	await expect(
		page.getByRole("heading", { name: "Start a Session" })
	).toBeVisible();
	await page.getByRole("checkbox", { name: clientB.name }).click();
	await page.getByLabel("Started at").fill("10:20");
	await page.getByRole("button", { name: "Start", exact: true }).click();

	await expect(page.getByText("How did you get here?")).toBeVisible();
	// The question can only be answered, never dismissed - a skipped gap
	// would silently bill no travel.
	await page.getByRole("dialog").press("Escape");
	await expect(page.getByText("How did you get here?")).toBeVisible();
	await expect(page.getByRole("button", { name: "Close" })).toHaveCount(0);
	await expect(page.getByLabel("Took (min)")).toHaveValue("20");
	await page.getByLabel("Drove (km)").fill("12");
	await page.getByRole("button", { name: "Log the drive" }).click();

	// Done for the day.
	await page.getByRole("button", { name: "End Session" }).click();
	await page.getByLabel("Finished at").fill("11:00");
	await page.getByRole("button", { name: "Done for the day" }).click();

	// The whole day promotes in one action.
	await expect(promoteStack(page).getByText("2 Sessions ·")).toBeVisible();
	await page.getByRole("button", { name: "Promote", exact: true }).click();
	await page.getByRole("button", { name: "Promote day" }).click();
	await expect(
		page.getByText("Created 2 Activities and a Trip.")
	).toBeVisible();

	// Promoted Sessions leave the Log...
	await page.getByRole("dialog").press("Escape");
	await expect(promoteStack(page).getByText("2 Sessions ·")).toBeHidden();
	await expect(
		logSection(page, clientA.name).getByText("no Sessions")
	).toBeVisible();
	expect(
		await prisma.workSession.count({ where: { ownerId: logUser.id } })
	).toBe(0);

	// ...and the Activity/Trip world now holds the day: two Pending
	// Activities, the in-session trip on A's Activity, and a Trip whose
	// inter-client leg bills the captured 12 km over the 20 minute gap.
	const activities = await prisma.activity.findMany({
		where: { clientId: { in: [clientA.id, clientB.id] } },
		include: { transportItems: true },
		orderBy: { startTime: "asc" }
	});
	expect(activities).toHaveLength(2);
	expect(activities[0].clientId).toBe(clientA.id);
	expect(activities[0].transportItems).toHaveLength(1);
	expect(Number(activities[0].transportItems[0].amount)).toBe(8);

	const trip = await prisma.trip.findFirst({
		where: { activities: { some: { clientId: clientA.id } } },
		include: { interClientLegs: true }
	});
	expect(trip).not.toBeNull();
	expect(trip?.interClientLegs).toHaveLength(1);
	expect(Number(trip?.interClientLegs[0].distance)).toBe(12);
	expect(Number(trip?.interClientLegs[0].duration)).toBe(20);
});

test("Every Client keeps a Log section, even with nothing captured", async ({
	page
}) => {
	const captured = await createRandomClient(logUser.id);
	const untouched = await createRandomClient(logUser.id);

	await page.goto("/dashboard/log");
	await page.getByRole("button", { name: "Start a Session" }).click();
	await page.getByRole("checkbox", { name: captured.name }).click();
	await page.getByLabel("Started at").fill("09:00");
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await expect(page.getByText("Session in progress")).toBeVisible();

	// The Log mirrors the notes-app habit: a section per Client, holding that
	// Client's running list of Sessions.
	await expect(
		logSection(page, captured.name).getByText("1 Session")
	).toBeVisible();
	await expect(
		logSection(page, captured.name).getByText("09:00 - open")
	).toBeVisible();

	// A Client with nothing captured keeps their section as standing
	// scaffolding rather than disappearing from the Log.
	await expect(
		logSection(page, untouched.name).getByText("no Sessions")
	).toBeVisible();
});

test("Capture works offline and syncs when signal returns", async ({
	page,
	context
}) => {
	const client = await createRandomClient(logUser.id);

	await page.goto("/dashboard/log");

	// Open the Start flow and wait for the Client list - proof the initial
	// pull has landed on-device - before dropping the connection.
	await page.getByRole("button", { name: "Start a Session" }).click();
	await expect(page.getByRole("checkbox", { name: client.name })).toBeVisible();
	await context.setOffline(true);

	await page.getByRole("checkbox", { name: client.name }).click();
	await page.getByLabel("Started at").fill("13:00");
	await page.getByRole("button", { name: "Start", exact: true }).click();

	// The tap landed locally, stamped at capture time - and nothing has
	// reached the server yet.
	await expect(page.getByText("Session in progress")).toBeVisible();
	await expect(page.getByText(/Offline - captures are saved/)).toBeVisible();
	await expect(page.getByText(/1 waiting to sync/)).toBeVisible();
	expect(
		await prisma.workSession.count({ where: { ownerId: logUser.id } })
	).toBe(0);

	// Signal returns: the queued capture replays without any user action.
	await context.setOffline(false);
	await expect
		.poll(() => prisma.workSession.count({ where: { ownerId: logUser.id } }), {
			timeout: 15_000
		})
		.toBe(1);
	await expect(page.getByText(/Offline - captures are saved/)).toBeHidden();

	const session = await prisma.workSession.findFirstOrThrow({
		where: { ownerId: logUser.id },
		include: { participants: true }
	});
	expect(session.endTime).toBeNull();
	expect(session.participants.map((p) => p.clientId)).toEqual([client.id]);
});

test("Open Session banner follows the Provider to other screens", async ({
	page
}) => {
	const client = await createRandomClient(logUser.id);

	await page.goto("/dashboard/log");
	await page.getByRole("button", { name: "Start a Session" }).click();
	await page.getByRole("checkbox", { name: client.name }).click();
	await page.getByLabel("Started at").fill("09:00");
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await expect(page.getByText("Session in progress")).toBeVisible();

	// The banner carries the open Session to every dashboard screen.
	await page.goto("/dashboard/invoices");
	await expect(page.getByText(client.name)).toBeVisible();
	await page.getByRole("button", { name: "End", exact: true }).click();
	await page.getByLabel("Finished at").fill("17:00");
	await page.getByRole("button", { name: "Done for the day" }).click();
	await expect(page.getByText(client.name)).toBeHidden();
});

test("A Session left open past its day is ended automatically at 23:59", async ({
	page
}) => {
	const client = await createRandomClient(logUser.id);

	// Yesterday's capture that was never ended - e.g. the phone stayed in the
	// glovebox overnight. Overnights are unsupported, so the store closes it
	// at end-of-day the moment it wakes up.
	const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
	await prisma.workSession.create({
		data: {
			ownerId: logUser.id,
			date: new Date(yesterday),
			startTime: new Date("1970-01-01T18:00:00Z"),
			participants: { create: [{ clientId: client.id }] }
		}
	});

	await page.goto("/dashboard/log");

	// The console is free for a new day, and yesterday (18:00-23:59, 6h)
	// joins the promote stack instead of blocking it.
	await expect(
		page.getByRole("button", { name: "Start a Session" })
	).toBeVisible();
	await expect(promoteStack(page).getByText("1 Session · 6h")).toBeVisible();

	await expect
		.poll(
			async () => {
				const session = await prisma.workSession.findFirst({
					where: { ownerId: logUser.id }
				});
				return session?.endTime?.toISOString() ?? null;
			},
			{ timeout: 15_000 }
		)
		.toBe("1970-01-01T23:59:00.000Z");

	// 23:59 is a guess at the real finish time, so the Provider is nudged to
	// review it rather than silently billing to midnight.
	await expect(page.getByText(/ended for you at 23:59/)).toBeVisible();
	await page.getByRole("button", { name: "23:59 is right" }).click();
	await expect(page.getByText(/ended for you at 23:59/)).toBeHidden();
});

test("Capture flows come up as a drawer on a phone and a dialog on a laptop", async ({
	page
}) => {
	const client = await createRandomClient(logUser.id);

	// Phone: every flow is a bottom drawer, within thumb reach and flush to
	// the bottom edge.
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/dashboard/log");
	await page.getByRole("button", { name: "Start a Session" }).click();

	const drawer = page.locator("[data-slot=drawer-popup]");
	await expect(drawer).toBeVisible();
	await expect(page.locator("[data-slot=drawer-swipe-handle]")).toBeVisible();
	const box = await drawer.boundingBox();
	expect(box?.x).toBe(0);
	expect(box?.width).toBe(390);
	expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(844);

	await page.getByRole("checkbox", { name: client.name }).click();
	await page.getByLabel("Started at").fill("09:00");
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await expect(page.getByText("Session in progress")).toBeVisible();

	await page.getByRole("button", { name: "End Session" }).click();
	await expect(drawer).toBeVisible();
	await page.getByRole("dialog").press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);

	// Laptop: the same flow is a centred dialog, no drawer in the tree.
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.getByRole("button", { name: "End Session" }).click();
	await expect(
		page.getByRole("heading", { name: "End Session" })
	).toBeVisible();
	await expect(drawer).toHaveCount(0);
});
