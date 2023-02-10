import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
	dir: "./",
});

const customJestConfig: Config = {
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	moduleDirectories: ["node_modules", "<rootDir>/"],
	testEnvironment: "jest-environment-jsdom",
	moduleNameMapper: {
		"^src/(.*)$": "<rootDir>/src/$1",
		"^@pages/(.*)$": "<rootDir>/src/pages/$1",
		"^@atoms/(.*)$": "<rootDir>/src/atoms/$1",
		"^@components/(.*)$": "<rootDir>/src/components/$1",
		"^@context/(.*)$": "<rootDir>/src/context/$1",
		"^@layouts/(.*)$": "<rootDir>/src/layouts/$1",
		"^@utils/(.*)$": "<rootDir>/src/utils/$1",
		"^@schema/(.*)$": "<rootDir>/src/schema/$1",
		"^@styles/(.*)$": "<rootDir>/src/styles/$1",
	},
	testMatch: ["<rootDir>/**/*.test.ts"],
	testPathIgnorePatterns: ["<rootDir>/e2e/"],
};

export default createJestConfig(customJestConfig);
