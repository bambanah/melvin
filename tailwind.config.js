/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			boxShadow: {
				top: "0 0px 10px 1px rgb(0 0 0 / 0.1)",
			},
			colors: {
				fg: "#1A1A0F",
				display: "#446928",
				bg: "#FCFBFC",
				brand: "#669B3C",
			},
		},
	},
	plugins: [],
};
