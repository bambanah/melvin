import { DefaultTheme } from "styled-components";

export const light: DefaultTheme = {
	type: "light",
	colors: {
		fg: "#283845",
		bg: "#fefbfd",
		link: "#2374ab",
		brand: "#FF7070",
		gradientPink:
			"linear-gradient(320deg, rgba(255,112,112,1) 0%, rgba(255,112,156,1) 100%)",
		error: "#ff574e",
	},
};

export const dark: DefaultTheme = {
	type: "dark",
	colors: {
		fg: "#FEFBFD",
		bg: "#161E27",
		link: "#4dccbd",
		brand: "#FF7070",
		gradientPink:
			"linear-gradient(31deg, rgba(255,112,112,1) 0%, rgba(255,112,156,1) 100%)",
		error: "#ff6961",
	},
};
