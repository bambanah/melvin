import { defineConfig } from "@playwright/test";

export default defineConfig({
	globalSetup: "./e2e/setup/global-setup.ts",
	use: {
		baseURL: "http://localhost:3000",
		storageState: "./e2e/setup/storage-state.json",
	},
	testDir: "./e2e",
});
