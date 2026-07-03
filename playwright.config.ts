import { defineConfig } from "@playwright/test";

export default defineConfig({
	globalSetup: require.resolve("./e2e/setup/global.setup.ts"),
	use: {
		headless: true,
		baseURL: "http://localhost:3000/dashboard",
		storageState: "./e2e/setup/storage-state.json",
		screenshot: "only-on-failure",
		trace: "retain-on-failure"
	},
	projects: [
		{ name: "e2e", testIgnore: /visual/ },
		{
			name: "visual",
			testMatch: /visual\/.*\.test\.ts/,
			use: {
				viewport: { width: 1280, height: 800 },
				colorScheme: "light"
			}
		}
	],
	// No platform suffix: baselines are Linux-authoritative (generated on
	// ubuntu CI via the update-snapshots workflow) — a single baseline set
	snapshotPathTemplate:
		"{testDir}/visual/__screenshots__/{testFileName}/{arg}{ext}",
	expect: {
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.01,
			animations: "disabled",
			caret: "hide"
		}
	},
	reporter: [["list"], ["html", { open: "never" }]],
	testDir: "./e2e",
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI
	}
});
