// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		"next/core-web-vitals",
		"plugin:@typescript-eslint/recommended",
		"plugin:unicorn/recommended",
		"prettier",
	],
	rules: {
		"quote-props": ["error", "consistent-as-needed"],
		"@typescript-eslint/no-var-requires": "off",
		"@typescript-eslint/no-empty-interface": "warn",
		"@typescript-eslint/ban-types": "warn",
		"import/no-anonymous-default-export": "off",
		"prefer-template": "error",
		"arrow-parens": ["error", "always"],
		"no-console": [
			"error",
			{
				allow: ["warn", "error"],
			},
		],
		"jsx-a11y/anchor-is-valid": "off",
		"jsx-a11y/no-static-element-interactions": "off",
		"jsx-a11y/click-events-have-key-events": "off",
		"jsx-a11y/label-has-associated-control": [
			2,
			{
				labelComponents: ["Label"],
				labelAttributes: ["label"],
				controlComponents: ["Input", "ClientSelect"],
				depth: 3,
			},
		],
		"unicorn/no-null": "off",
		"unicorn/prefer-module": "off",
		"unicorn/no-array-reduce": "off",
		"unicorn/prefer-top-level-await": "off",
		"unicorn/prevent-abbreviations": "off",
	},
	overrides: [
		{
			files: ["**/*.unit.@(test|spec).[jt]s?(x)"],
			plugins: ["testing-library"],
			extends: ["plugin:testing-library/react"],
		},
		{
			files: ["**/e2e/**/*.@(test|spec).[jt]s?(x)"],
			extends: ["plugin:playwright/playwright-test"],
			rules: {
				"playwright/no-skipped-test": "off",
			},
		},
	],
};
