import { Page } from "@playwright/test";

export async function waitForAlert(page: Page, text: string) {
	return await page.getByRole("alert").filter({ hasText: text }).click();
}
