import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`	
	html,
	body {
		margin: 0;
		font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
			"Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
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
			color: #363636;
		}
	}
`;

export default GlobalStyle;
