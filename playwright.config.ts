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
	projects: [{ name: "e2e" }],
	reporter: [["list"], ["html", { open: "never" }]],
	testDir: "./e2e",
	webServer: {
		// CI runs against a production build: `next dev`'s on-demand route
		// compilation races with CI's limited CPU/network and intermittently
		// stalls navigations past test timeouts.
		//
		// E2E_WEB_SERVER_COMMAND overrides the command so the better-auth
		// migration (#418) and framework swap (#419) can point Playwright at a
		// different server without editing this file; the defaults keep existing
		// local and CI runs unchanged.
		command:
			process.env.E2E_WEB_SERVER_COMMAND ??
			(process.env.CI ? "pnpm start" : "pnpm dev:next"),
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI
	}
});
