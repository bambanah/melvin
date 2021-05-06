module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "./tsconfig.eslint.json",
	},
	rules: {
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"no-param-reassign": ["error", { props: false }],
		"react/jsx-props-no-spreading": 0,
		"react/prop-types": 0,
		"react/require-default-props": 0,
		quotes: ["error", "double"],
	},
	plugins: ["@typescript-eslint"],
	extends: ["airbnb-typescript", "prettier"],
};
