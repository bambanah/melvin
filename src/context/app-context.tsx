import React, {
	createContext,
	Dispatch,
	useContext,
	useEffect,
	useState,
} from "react";

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

interface Props {
	children: React.ReactNode;
}

export const AppContextProvider: React.FC<Props> = ({ children }) => {
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
			{children}
		</AppContext.Provider>
	);
};

export const useTheme = () => {
	return useContext(AppContext).theme;
};
