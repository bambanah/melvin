/** @type {import("prettier").Config} */
module.exports = {
	singleQuote: false,
	useTabs: true,
	endOfLine: "lf",
	trailingComma: "es5",
	plugins: [require.resolve("prettier-plugin-tailwindcss")],
	tailwindConfig: "./tailwind.config.js",
};
