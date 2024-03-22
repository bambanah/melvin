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
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	testMatch: ["<rootDir>/**/*.test.ts"],
	testPathIgnorePatterns: ["<rootDir>/e2e/"],
};

export default createJestConfig(customJestConfig);
