import { expect, test } from "@playwright/test";
import {
	createRandomClient,
	createRandomSupportItem,
	waitForAlert,
} from "./test-utils";

test("Can create, update, and delete activities", async ({ page }) => {
	await page.goto("/dashboard");

	const client = await createRandomClient(page);
	const supportItem = await createRandomSupportItem(page);

	await page.getByRole("link", { name: "Activities" }).nth(0).click();
	await expect(page).toHaveURL("/dashboard/activities");
	await page.getByRole("link", { name: "Add" }).click();

	await page.locator(".react-select").nth(0).click();
	await page.getByText(supportItem.description, { exact: true }).nth(0).click();
	await page.locator(".react-select").nth(1).click();
	await page.getByText(client.name, { exact: true }).click();

	// TODO: Randomise time
	await page.locator("#startTime").fill("09:15");
	await page.locator("#endTime").fill("15:23");
	await page.getByRole("button", { name: "Create" }).click();

	await waitForAlert(page, "activity created");

	await expect(page).toHaveURL("/dashboard/activities");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();

	await page.locator("button#options-dropdown").click();
	await page.getByRole("menuitem", { name: "Edit" }).click();

	await page.locator("#startTime").fill("13:25");
	await page.locator("#endTime").fill("16:56");
	await page.getByRole("button", { name: "Update" }).click();
	await waitForAlert(page, "activity updated");

	await page.getByRole("link", { name: "Activities" }).click();
	await expect(page).toHaveURL("/dashboard/activities");

	await page
		.getByRole("link")
		.filter({ hasText: supportItem.description })
		.click();

	await page.locator("button#options-dropdown").click();
	await page.locator("button").filter({ hasText: "Delete" }).click();
	await page.locator("button").filter({ hasText: "Delete" }).click();
	await waitForAlert(page, "activity deleted");
});
