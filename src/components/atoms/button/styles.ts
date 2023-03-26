import { transparentize } from "polished";
import styled from "styled-components";

export const BaseButton = styled.button`
	display: inline-block;

	font-size: 1rem;
	font-weight: bold;

	cursor: pointer;
	padding: 0.4em 1.3em;

	transition: all 0.1s ease;

	border: 1px solid ${({ theme }) => theme.colors.fg};

	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};

	&:hover,
	&.raised {
		transform: translate(-0.2rem, -0.2rem);
		box-shadow: 0.2rem 0.2rem #000;
	}

	&.disabled {
		cursor: auto;

		border-color: ${({ theme }) => transparentize(0.8, theme.colors.fg)};

		color: ${({ theme }) => theme.colors.fg}77;
		background-color: ${({ theme }) => transparentize(0.2, theme.colors.bg)};

		&:hover {
			transform: none;
			box-shadow: none;
		}
	}
`;

export const PrimaryButton = styled(BaseButton)`
	border: none;
	color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.bg : theme.colors.bg};
	background-color: ${({ theme }) => theme.colors.brand};

	&.disabled {
		color: ${({ theme }) => theme.colors.bg}77;
		background-color: ${({ theme }) => theme.colors.brand}77;
	}
`;

export const SecondaryButton = styled(BaseButton)`
	color: ${({ theme }) => theme.colors.bg};
	background-color: ${({ theme }) => theme.colors.fg};

	&.disabled {
		color: ${({ theme }) => transparentize(0.3, theme.colors.bg)};
		background-color: ${({ theme }) => transparentize(0.8, theme.colors.fg)};
	}
`;

export const SuccessButton = styled(BaseButton)`
	color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.fg : theme.colors.bg};
	background-color: ${({ theme }) => theme.colors.success};

	&.disabled {
		color: ${({ theme }) =>
			transparentize(
				0.3,
				theme.type === "light" ? theme.colors.fg : theme.colors.bg
			)};
		background-color: ${({ theme }) =>
			transparentize(0.8, theme.colors.success)};
	}
`;

export const DangerButton = styled(BaseButton)`
	color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.bg : theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.error};

	&.disabled {
		color: ${({ theme }) =>
			transparentize(
				0.3,
				theme.type === "light" ? theme.colors.bg : theme.colors.fg
			)};
		background-color: ${({ theme }) => transparentize(0.8, theme.colors.error)};
	}
`;
