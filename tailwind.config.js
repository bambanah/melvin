const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				display: ["var(--font-patua-one)", ...defaultTheme.fontFamily.sans],
				sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
				mono: ["var(--font-space-mono)", ...defaultTheme.fontFamily.mono],
			},
			boxShadow: {
				top: "0 0px 10px 1px rgb(0 0 0 / 0.1)",
			},
			colors: {
				fg: "#272D2D",
				bg: "#F6F8FF",
				display: "#4F4789",
			},
		},
	},
	plugins: [],
};
