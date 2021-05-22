module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "./tsconfig.json",
	},
	rules: {
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"no-param-reassign": ["error", { props: false }],
		"react/jsx-props-no-spreading": 0,
		"react/prop-types": 0,
		"react/require-default-props": 0,
		quotes: ["error", "double"],
		"jsx-a11y/anchor-is-valid": 0,
		"import/no-extraneous-dependencies": 0,
	},
	plugins: ["@typescript-eslint"],
	extends: ["airbnb-typescript", "prettier"],
};
