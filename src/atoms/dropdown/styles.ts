import { shade, lighten } from "polished";
import styled from "styled-components";

export const DropdownContainer = styled.div`
	position: relative;

	button:first-of-type {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding: 0.6em 0.7em;
	}

	button:last-of-type {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		padding: 0.6em 0.5em;
		border-left-width: 0;
	}
`;

export const DropdownContent = styled.div`
	position: absolute;
	display: flex;
	flex-direction: column;
	z-index: 100;

	overflow: hidden;
	position: fixed;

	border: 0.1em solid ${({ theme }) => theme.colors.fg}33;

	a {
		padding: 0.5em 1em;
		min-width: 8em;
		width: 100%;
		background-color: ${({ theme }) => theme.colors.bg};

		cursor: pointer;

		color: ${({ theme }) => theme.colors.fg};

		svg {
			margin-right: 0.2em;
		}

		&:hover {
			background-color: ${({ theme }) =>
				theme.type === "light"
					? shade(0.2, theme.colors.bg)
					: lighten(0.1, theme.colors.bg)};
		}
	}
`;
