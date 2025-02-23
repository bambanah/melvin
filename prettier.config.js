/** @type {import("prettier").Config} */
module.exports = {
	useTabs: true,
	plugins: [require.resolve("prettier-plugin-tailwindcss")],
	tailwindConfig: "./tailwind.config.js",
	overrides: [
		{
			files: "pnpm-lock.yaml",
			options: {
				singleQuote: true,
			},
		},
	],
};
