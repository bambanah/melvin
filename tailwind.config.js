const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				display: ["var(--font-patua-one)", ...defaultTheme.fontFamily.sans],
				sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
			},
			boxShadow: {
				top: "0 0px 10px 1px rgb(0 0 0 / 0.1)",
			},
			colors: {
				fg: "#272D2D",
				bg: "#F6F8FF",
				display: "#4F4789",
				brand: "#FFB17A",
				green_pastel: "#B0F2B4",
				light_blue: "#BAF2E9",
				blue_pastel: "#BAD7F2",
				pink_pastel: "#F2BAC9",
				yellow_pastel: "#F2E2BA",
			},
		},
	},
	plugins: [],
};
