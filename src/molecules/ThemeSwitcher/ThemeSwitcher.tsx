import Button from "@atoms/Button";
import { useTheme } from "@context/appContext";
import React from "react";

const ThemeSwitcher = () => {
	const [theme, setTheme] = useTheme();

	return (
		<Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
			Switch
		</Button>
	);
};

export default ThemeSwitcher;
