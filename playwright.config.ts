import { defineConfig } from "@playwright/test";

export default defineConfig({
	globalSetup: "./e2e/setup/global-setup.ts",
	use: {
		headless: !!process.env.CI,
		baseURL: "http://localhost:3000",
		storageState: "./e2e/setup/storage-state.json",
		screenshot: "only-on-failure",
	},
	testDir: "./e2e",
	webServer: {
		command: "yarn dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
});
