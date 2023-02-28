/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				fg: "#1A1A0F",
				display: "#446928",
				bg: "#FCFBFC",
				brand: "#669B3C",
			},
		},
	},
	plugins: [],
	important: true,
};
