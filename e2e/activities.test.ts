import prisma from "@/server/prisma";
import { expect, test } from "@playwright/test";
import {
	createDefaultSupportItem,
	createRandomActivity,
	createRandomClient,
	createRandomSupportItem,
	waitForAlert
} from "./test-utils";

test("Can create activity", async ({ page }) => {
	const client = await createRandomClient();
	await createDefaultSupportItem();
	await prisma.client.update({
		where: { id: client.id },
		data: { distanceToClient: 40, travelTimeToClient: 55 }
	});

	await page.goto("/dashboard");

	await page.getByRole("button", { name: "Add Activity" }).click();
	await page.getByTestId("client-search-input").click();
	await page.getByPlaceholder("Search clients...").fill(client.name);
	await page.getByRole("button", { name: client.name }).click();
	await page.getByTestId("time-range-input").fill("08:00-09:00");
	await page.getByRole("button", { name: "Save all" }).click();

	await waitForAlert(page, "saved");

	// A day of one activity forms no trip, so it bills the return trip home →
	// client → home with each leg capped at 30 minutes - it used to be saved with
	// no provider travel at all.
	const saved = await prisma.activity.findFirstOrThrow({
		where: { clientId: client.id }
	});
	expect(saved.tripId).toBeNull();
	expect(Number(saved.transitDistance)).toBe(80);
	expect(Number(saved.transitDuration)).toBe(60);
});

test("Can edit activity", async ({ page }) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	const activity = await createRandomActivity(client.id, supportItem.id, {
		startTime: "11:00",
		endTime: "12:00"
	});

	await page.goto("/dashboard/activities");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();

	await page.getByRole("link", { name: "Edit" }).click();

	await page.getByLabel("Start Time").fill("11:30");
	await page.getByLabel("End Time").fill("12:30");
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "activity updated");
	await expect(page).toHaveURL(`/dashboard/activities/${activity.id}`);
});

test("Editing an activity keeps its support item, provider travel and transport", async ({
	page
}) => {
	const client = await createRandomClient();
	// A default support item the activity is deliberately NOT billed under, and a
	// client whose stored travel differs from the activity's — both used to be
	// written over the loaded activity the moment the edit form mounted.
	await createDefaultSupportItem();
	const supportItem = await createRandomSupportItem();
	await prisma.client.update({
		where: { id: client.id },
		data: { distanceToClient: 40, travelTimeToClient: 55 }
	});
	const activity = await createRandomActivity(
		client.id,
		supportItem.id,
		{ startTime: "11:00", endTime: "12:00" },
		{
			transitDistance: 12.5,
			transitDuration: 20,
			transportItems: [
				{ type: "DISTANCE", amount: 8.4 },
				{ type: "PARKING", amount: 6.5, note: "carpark" }
			]
		}
	);

	// Reached through the detail page, so the form's post-save `router.back()`
	// lands on a real history entry.
	await page.goto(`/dashboard/activities/${activity.id}`);
	await page.getByRole("link", { name: "Edit" }).click();

	await page.getByRole("button", { name: "Advanced Options" }).click();

	await expect(page.getByLabel("Transit Distance")).toHaveValue("12.5");
	await expect(page.getByLabel("Transit Duration")).toHaveValue("20");
	await expect(page.getByLabel("Activity Based Transport")).toHaveValue("8.4");
	// The parking row, in the parking / tolls editor
	await expect(page.getByPlaceholder("0.00")).toHaveValue("6.5");
	await expect(
		page.getByRole("combobox", { name: /Support Item/ })
	).toContainText(supportItem.description);

	await page.getByLabel("End Time").fill("12:30");
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "activity updated");

	const saved = await prisma.activity.findUniqueOrThrow({
		where: { id: activity.id },
		include: { transportItems: true }
	});

	expect(saved.supportItemId).toBe(supportItem.id);
	expect(saved.transitDistance?.toString()).toBe("12.5");
	expect(saved.transitDuration?.toString()).toBe("20");
	expect(
		saved.transportItems.map((item) => `${item.type}:${item.amount}`).sort()
	).toEqual(["DISTANCE:8.4", "PARKING:6.5"]);
});

test("A new activity prefills the client's return trip as provider travel", async ({
	page
}) => {
	const client = await createRandomClient();
	await createDefaultSupportItem();
	await prisma.client.update({
		where: { id: client.id },
		data: { distanceToClient: 40, travelTimeToClient: 55 }
	});

	await page.goto("/dashboard/activities/create");

	await page.getByRole("combobox", { name: "Client" }).click();
	await page.getByRole("option", { name: client.name }).click();
	await page.getByRole("button", { name: "Advanced Options" }).click();

	// Home → client → home: 40 km each way, and 55 minutes each way capped at the
	// 30-minute Travel Time Cap per leg.
	await expect(page.getByLabel("Transit Distance")).toHaveValue("80");
	await expect(page.getByLabel("Transit Duration")).toHaveValue("60");
});

test("Activity detail shows the billing breakdown", async ({ page }) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	const activity = await createRandomActivity(client.id, supportItem.id, {
		startTime: "09:00",
		endTime: "10:00"
	});

	await page.goto(`/dashboard/activities/${activity.id}`);

	// Header surfaces the support item code the SUPPORT line bills under (it
	// also appears on the SUPPORT breakdown row, hence `.first()`).
	await expect(page.getByText(supportItem.weekdayCode).first()).toBeVisible();
	// Uninvoiced activities read as Pending.
	await expect(page.getByText("Pending")).toBeVisible();
	// The centrepiece breakdown with a priced total.
	await expect(page.getByText("Billing breakdown")).toBeVisible();
	await expect(page.getByTestId("breakdown-total")).toContainText("$");
});

test("Can delete activity", async ({ page }) => {
	const client = await createRandomClient();
	const supportItem = await createRandomSupportItem();
	await createRandomActivity(client.id, supportItem.id, {
		startTime: "14:00",
		endTime: "15:00"
	});

	await page.goto("/dashboard/activities");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();

	await page.getByRole("button", { name: "Activity actions" }).click();
	page.once("dialog", (dialog) => {
		dialog.accept().catch(() => {});
	});
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await waitForAlert(page, "activity deleted");
});
