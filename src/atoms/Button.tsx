/* eslint-disable react/button-has-type */
import { shade } from "polished";
import React, { FC } from "react";
import styled from "styled-components";

interface ButtonProps extends React.HTMLProps<HTMLButtonElement> {
	onClick?: () => void;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
}

const defaultProps: ButtonProps = {
	onClick: () => {},
	disabled: false,
};

const BlandButton: FC<ButtonProps> = ({
	children,
	onClick,
	disabled,
	type,
	...rest
}: ButtonProps) => {
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		if (!disabled && onClick) {
			onClick();
		}
	};

	return (
		<button
			onClick={handleClick}
			disabled={disabled}
			type={type || "button"}
			{...rest}
		>
			{children}
		</button>
	);
};

BlandButton.defaultProps = defaultProps;

const Button = styled(({ primary, ...rest }) => <BlandButton {...rest} />)`
	display: inline-block;

	font-family: "Inter";
	font-size: 1rem;

	color: ${({ theme, primary }) =>
		theme.type === "light" && primary ? theme.colors.bg : theme.colors.fg};
	background-color: ${({ theme, primary }) =>
		primary ? theme.colors.brand : theme.colors.bg};

	border: 1px solid
		${({ theme, primary }) => (primary ? "transparent" : theme.colors.fg)};
	border-radius: 0.2em;

	cursor: pointer;
	padding: 0.8em 2em;

	transition: all 0.06s ease;

	box-shadow: 2px 2px 8px
		${({ primary }) => (primary ? "rgba(0, 0, 0, 0.2)" : "transparent")};

	&:hover {
		background-color: ${({ primary, theme }) =>
			primary ? shade(0.2, theme.colors.brand) : theme.colors.fg};
		color: ${({ primary, theme }) =>
			primary && theme.type === "dark" ? theme.colors.fg : theme.colors.bg};
		box-shadow: 1px 1px 4px
			${({ primary }) => (primary ? "rgba(0, 0, 0, 0.2)" : "transparent")};
	}
`;

export default Button;
