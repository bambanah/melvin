import { shade } from "polished";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
	html,
	body {
		margin: 0;
		font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
			"Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;

		color: ${({ theme }) => theme.colors.fg};
		background-color: ${({ theme }) => theme.colors.bg};
	}

	* {
		font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
    "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
		transition: color 0.3s ease;
		transition: background-color 0.3s ease;
	}

	*,
	*::before,
	*::after {
		box-sizing: border-box;
	}

	a {
		cursor: pointer;
		text-decoration: none;
		color: ${({ theme }) => theme.colors.link};

		&:hover {
			color: ${({ theme }) => shade(0.15, theme.colors.fg)};
		}
	}
`;

export default GlobalStyle;
