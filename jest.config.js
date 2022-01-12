const nextJest = require("next/jest");

const createJestConfig = nextJest({
	dir: "./",
});

const customJestConfig = {
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	moduleDirectories: ["node_modules", "<rootDir>/"],
	testEnvironment: "jest-environment-jsdom",
	moduleNameMapper: {
		"^src/(.*)$": "<rootDir>/src/$1",
		"^@pages/(.*)$": "<rootDir>/src/pages/$1",
		"^@atoms/(.*)$": "<rootDir>/src/atoms/$1",
		"^@context/(.*)$": "<rootDir>/src/context/$1",
		"^@layouts/(.*)$": "<rootDir>/src/layouts/$1",
		"^@molecules/(.*)$": "<rootDir>/src/molecules/$1",
		"^@organisms/(.*)$": "<rootDir>/src/organisms/$1",
		"^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
		"^@utils/(.*)$": "<rootDir>/src/utils/$1",
		"^@schema/(.*)$": "<rootDir>/src/schema/$1",
		"^@styles/(.*)$": "<rootDir>/src/styles/$1",
	},
	testMatch: ["<rootDir>/__tests__/**"],
};

module.exports = createJestConfig(customJestConfig);
