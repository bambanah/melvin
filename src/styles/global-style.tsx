import { shade } from "polished";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
	:root {
		--shadow-low: 4px 4px 16px rgba(0, 0, 0, 0.17);
		--shadow-medium: 8px 8px 36px rgba(0, 0, 0, 0.17);
		--shadow-high: 16px 16px 48px rgba(0, 0, 0, 0.22);

		--radius-small: 0.3em;
		--radius-medium: 0.6em;
		--radius-large: 1em;

		--breakpoint-sm: 500px;
		--breakpoint-md: 700px;
		--breakpoint-lg: 1200px;
	}

	html,
	body {
		margin: 0;

		color: ${({ theme }) => theme.colors.fg};
		background-color: ${({ theme }) => theme.colors.bg};
		overflow-x: hidden;
	}

	* {
		font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
			"Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		transition: color 0.1s, background-color 0.1s;
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
