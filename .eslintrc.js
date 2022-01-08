module.exports = {
	env: {
		browser: true,
		es2021: true
	},
	root: true,
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "./tsconfig.json",
	},
	plugins: ["@typescript-eslint", "jsx-a11y", "import", "react", "react-hooks"],
	extends: ["airbnb-typescript", "prettier"],
	rules: {
		"quote-props": ["error", "consistent-as-needed"],
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"no-param-reassign": ["error", { props: false }],
		"react/jsx-props-no-spreading": 0,
		"react/prop-types": 0,
		"react/require-default-props": 0,
		"quotes": ["error", "double"],
		"jsx-a11y/anchor-is-valid": 0,
		"import/no-extraneous-dependencies": 0,
		"jsx-a11y/label-has-associated-control": [
			"error",
			{
				required: {
					some: ["nesting", "id"],
				},
			},
		],
		"jsx-a11y/label-has-for": [
			"error",
			{
				required: {
					some: ["nesting", "id"],
				},
			},
		],
		"no-alert": 0,
		"no-restricted-globals": 1,
		"react-hooks/rules-of-hooks": "error",
		"react-hooks/exhaustive-deps": "warn",
	},
};
