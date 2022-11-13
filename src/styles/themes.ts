import { DefaultTheme } from "styled-components";

export const light: DefaultTheme = {
	type: "light",
	colors: {
		fg: "#1A1A0F",
		display: "#446928",
		bg: "#FCFBFC",
		link: "#2374ab",
		brand: "#669B3C",
		success: "#ebfcf6",
		gradientPink:
			"linear-gradient(31deg, rgba(255,112,112,1) 0%, rgba(215,185,255,1) 100%)",
		error: "#F14348",
	},
};

export const dark: DefaultTheme = {
	type: "dark",
	colors: {
		fg: "#FEFBFD",
		display: "#38574D",
		bg: "#161E27",
		link: "#4dccbd",
		brand: "#567568",
		success: "ebfcf6",
		gradientPink:
			"linear-gradient(31deg, rgba(255,112,112,1) 0%, rgba(255,112,156,1) 100%)",
		error: "#ff6961",
	},
};

export const breakpoints = {
	mobile: `(max-width: 425px)`,
	tablet: `(max-width: 768px)`,
	laptop: `(max-width: 1024px)`,
	desktop: `(max-width: 1200px)`,
};
