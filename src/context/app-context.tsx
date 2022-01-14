import React, {
	createContext,
	Dispatch,
	useContext,
	useEffect,
	useState,
} from "react";
import { ThemeProvider } from "styled-components";
import * as themes from "@styles/themes";

interface AppContextState {
	theme: [string, Dispatch<string>];
}

const AppContext = createContext<AppContextState>({
	theme: [
		"light",
		() => {
			// do nothing
		},
	],
});

export const AppContextProvider: React.FC = ({ children }) => {
	let initialTheme = "light";

	if (typeof window !== "undefined") {
		initialTheme = localStorage.getItem("theme") ?? "light";
	}

	const [theme, setTheme] = useState(initialTheme);

	useEffect(() => {
		if (theme !== localStorage.getItem("theme")) {
			localStorage.setItem("theme", theme);
		}
	}, [theme]);

	return (
		<AppContext.Provider value={{ theme: [theme, setTheme] }}>
			<ThemeProvider theme={theme === "light" ? themes.light : themes.dark}>
				{children}
			</ThemeProvider>
		</AppContext.Provider>
	);
};

export const useTheme = () => {
	return useContext(AppContext).theme;
};
