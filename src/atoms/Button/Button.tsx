/* eslint-disable react/button-has-type */
import { shade } from "polished";
import styled, { css } from "styled-components";

interface ButtonProps {
	primary?: boolean;
}

const Button = styled.button<ButtonProps>`
	display: inline-block;

	font-family: "Inter";
	font-size: 1rem;

	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};

	border: 1px solid ${({ theme }) => theme.colors.fg};
	border-radius: 0.2em;

	cursor: pointer;
	padding: 0.8em 2em;

	transition: all 0.06s ease;

	${({ disabled, theme }) =>
		disabled
			? css`
					color: ${theme.colors.fg}77;
					cursor: auto;
					border-color: ${theme.colors.fg}77;
					background-color: ${theme.colors.bg}77;
			  `
			: css`
					&:hover {
						background-color: ${theme.colors.fg};
						color: ${theme.colors.bg};
						box-shadow: 1px 1px 4px transparent;
					}
			  `}

	${({ disabled, theme }) =>
		!disabled &&
		css`
			&.danger {
				border: none;
				background-color: ${theme.colors.error}dd;

				&:hover {
					color: ${theme.colors.fg};
					background-color: ${theme.colors.error}99;
				}
			}
		`}

	${({ primary, disabled, theme }) =>
		primary &&
		css`
			color: ${!disabled
				? theme.type === "light"
					? theme.colors.bg
					: theme.colors.fg
				: theme.colors.bg + "77"};
			background-color: ${disabled
				? theme.colors.brand + "77"
				: theme.colors.brand};
			box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
			border: none;

			&:hover {
				box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
				background-color: ${disabled
					? theme.colors.brand + "77"
					: shade(0.2, theme.colors.brand)};
				color: ${!disabled
					? theme.type === "light"
						? theme.colors.bg
						: theme.colors.fg
					: theme.colors.bg + "77"};
			}
		`}
`;

export default Button;
