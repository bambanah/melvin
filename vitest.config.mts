import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		environment: "jsdom",
		include: ["./src/**/*.test.?(c|m)[jt]s?(x)"],
		exclude: [...configDefaults.exclude, "./src/**/*.integration.test.ts"],
		setupFiles: ["./src/test/setup.ts"],
		watch: false
	}
});
