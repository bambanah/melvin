import { shade } from "polished";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
	html,
	body {
		margin: 0;
		font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
			"Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;

		color: ${({ theme }) => theme.colors.fg};
		background-color: ${({ theme }) => theme.colors.bg};

		transition: color 0.3s ease;
		transition: background-color 0.3s ease;
	}

	* {
		font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
    "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
	}

	*,
	*::before,
	*::after {
		box-sizing: border-box;
	}

	a {
		color: ${(props) => props.theme.colors.link};
		text-decoration: none;
		cursor:pointer;

		&:hover {
			color: ${(props) => shade(0.15, props.theme.colors.fg)};
		}
	}
`;

export default GlobalStyle;
