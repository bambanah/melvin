import { Page, expect } from "@playwright/test";
import { randomClient } from "./random/random-client";
import { randomSupportItem } from "./random/random-support-item";

export async function waitForAlert(page: Page, text: string) {
	return await page
		.locator(".Toastify__toast")
		.filter({ hasText: text })
		.getByLabel("close")
		.click();
}

export async function createRandomSupportItem(page: Page) {
	const supportItem = randomSupportItem();

	await page.getByRole("link", { name: "Items" }).click();
	await expect(page).toHaveURL("/dashboard/support-items");
	await page.getByRole("link", { name: "Add" }).click();

	await page.getByLabel("Description").fill(supportItem.description);
	await page
		.getByPlaceholder("XX_XXX_XXXX_X_X")
		.first()
		.fill(supportItem.weekdayCode);
	await page.getByPlaceholder("rate").first().fill(supportItem.weekdayRate);
	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "support item created");

	return supportItem;
}

export async function createRandomClient(page: Page) {
	const client = randomClient();

	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/dashboard/clients");
	await page.getByRole("link", { name: "Add" }).click();

	await page.getByLabel("Participant Name").fill(client.name);
	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "client created");

	return client;
}

export async function createRandomActivity(
	page: Page,
	clientName: string,
	supportItemDescription: string
) {
	await page.getByRole("link", { name: "Activities" }).nth(0).click();
	await expect(page).toHaveURL("/dashboard/activities");
	await page.getByRole("link", { name: "Add" }).click();

	await page.getByText("Select a support item...").click();
	await page.getByLabel(supportItemDescription).click();
	await page.getByText("Select a client...").click();
	await page.getByLabel(clientName).first().click();

	await page.getByLabel("Start Time").fill("09:15");
	await page.getByLabel("End Time").fill("15:23");
	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "activity created");
}
