import { useTheme } from "@context/appContext";
import React from "react";
import * as Styles from "./styles";

const ThemeSwitch = () => {
	const [theme, setTheme] = useTheme();

	return (
		<Styles.Wrapper
			onClick={() => setTheme(theme === "light" ? "dark" : "light")}
			className={theme}
		>
			<Styles.Stars className={theme}>
				{[
					[10, 3, 2],
					[3, 7, 1],
					[12, 18, 1],
					[15, 10, 1],
					[19, 4, 1],
					[22, 14, 2],
				].map(([x, y, size], index) => (
					<Styles.Star
						x={x}
						y={y}
						size={size}
						speed={(index + 1) * 50}
						className={theme}
						key={x * y * size}
					/>
				))}
			</Styles.Stars>
			<Styles.Circle className={theme}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="30"
					height="32"
					viewBox="0 0 30 32"
				>
					<title>moon-inv</title>
					<path d="M22.592 21.504q3.36 0 6.56-1.792-1.344 4.64-5.184 7.616t-8.8 2.976q-6.016 0-10.304-4.288T.576 15.68q0-4.928 2.976-8.768t7.584-5.216q-1.792 3.2-1.792 6.56 0 5.504 3.904 9.376t9.344 3.872z"></path>
				</svg>
			</Styles.Circle>
		</Styles.Wrapper>
	);
};

export default ThemeSwitch;
