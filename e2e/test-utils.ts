import { Page, expect } from "@playwright/test";
import { randomClient } from "./random/random-client";
import { randomSupportItem } from "./random/random-support-item";

export async function waitForAlert(page: Page, text: string) {
	return await page.getByRole("alert").filter({ hasText: text }).click();
}

export async function createRandomSupportItem(page: Page) {
	const supportItem = randomSupportItem();

	await page.getByRole("link", { name: "Items" }).click();
	await expect(page).toHaveURL("/support-items");
	await page.getByRole("link", { name: "Add New" }).click();

	await page.locator("#description").fill(supportItem.description);
	await page.locator("#weekdayCode").fill(supportItem.weekdayCode);
	await page.locator("#weekdayRate").fill(supportItem.weekdayRate);
	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "support item created");

	return supportItem;
}

export async function createRandomClient(page: Page) {
	const client = randomClient();

	await page.getByRole("link", { name: "Clients" }).click();
	await expect(page).toHaveURL("/clients");
	await page.getByRole("link", { name: "Add New" }).click();

	await page.locator("#name").fill(client.name);
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
	await expect(page).toHaveURL("/activities");
	await page.getByRole("link", { name: "Add New" }).click();

	await page.locator(".react-select").nth(0).click();
	await page.getByText(supportItemDescription, { exact: true }).click();
	await page.locator(".react-select").nth(1).click();
	await page.getByText(clientName, { exact: true }).click();

	await page.locator("#startTime").fill("09:15");
	await page.locator("#endTime").fill("15:23");
	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "activity created");
}
