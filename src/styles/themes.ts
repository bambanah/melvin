import { DefaultTheme } from "styled-components";

export const light: DefaultTheme = {
	type: "light",
	colors: {
		bg: "#fefbfd",
		fg: "#283845",
		link: "#2374ab",
		brand: "#ff8484",
		error: "#ff6961",
	},
};

export const dark: DefaultTheme = {
	type: "dark",
	colors: {
		bg: "#202C39",
		fg: "#FEFBFD",
		link: "#4dccbd",
		brand: "#ff8484",
		error: "#ff6961",
	},
};

export const dracula: DefaultTheme = {
	type: "dark",
	colors: {
		bg: "#282a36",
		fg: "#f8f8f2",
		link: "#8be9fd",
		brand: "#ff79c6",
		error: "#ff5555",
	},
};
