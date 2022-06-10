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
		margin-left: -1px;
	}
`;

export const DropdownContent = styled.div`
	position: absolute;
	display: flex;
	flex-direction: column;
	z-index: 100;
	min-width: 100%;
	right: 0;

	a {
		padding: 0.5em 1em;
		min-width: 6.5em;
		width: 100%;
		background-color: ${({ theme }) => theme.colors.bg};

		cursor: pointer;

		color: ${({ theme }) => theme.colors.fg};

		border: 0.1em solid ${({ theme }) => theme.colors.fg};
		margin-top: -0.1em;
		transition: all 0.1s ease;

		&.primary {
			font-weight: bold;
		}

		svg {
			margin-right: 0.2em;
		}

		&:hover {
			transform: translate(-0.21rem, -0.2rem);
			box-shadow: 0.2rem 0.2rem #000;
		}
	}
`;
