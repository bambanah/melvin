import { DefaultTheme } from "styled-components";

export const light: DefaultTheme = {
	type: "light",
	colors: {
		fg: "#1a242c",
		bg: "#fefbfd",
		link: "#2374ab",
		brand: "#FF7070",
		green: "#EBFCF6",
		gradientPink:
			"linear-gradient(31deg, rgba(255,112,112,1) 0%, rgba(215,185,255,1) 100%)",
		error: "#F14348",
	},
};

export const dark: DefaultTheme = {
	type: "dark",
	colors: {
		fg: "#FEFBFD",
		bg: "#161E27",
		link: "#4dccbd",
		brand: "#FF7070",
		green: "",
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
