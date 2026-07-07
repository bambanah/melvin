import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: "node",
		include: ["./src/**/*.integration.test.ts"],
		fileParallelism: false,
		globalSetup: ["./src/server/api/test/global-setup.ts"],
		watch: false
	}
});
