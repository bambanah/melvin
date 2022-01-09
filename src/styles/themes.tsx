import { DefaultTheme } from "styled-components";

export const light: DefaultTheme = {
	type: "light",
	colors: {
		fg: "#283845",
		bg: "#fefbfd",
		link: "#2374ab",
		brand: "#FF7070",
		error: "#fa342a",
	},
};

export const dark: DefaultTheme = {
	type: "dark",
	colors: {
		fg: "#FEFBFD",
		bg: "#202C39",
		link: "#4dccbd",
		brand: "#FF7070",
		error: "#ff6961",
	},
};

export const dracula: DefaultTheme = {
	type: "dark",
	colors: {
		fg: "#f8f8f2",
		bg: "#282a36",
		link: "#8be9fd",
		brand: "#ff79c6",
		error: "#ff5555",
	},
};
