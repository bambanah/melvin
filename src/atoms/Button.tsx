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

	color: ${(props) => props.theme.colors.fg};
	background-color: ${({ theme, primary }) =>
		primary ? theme.colors.brand : theme.colors.bg};

	border: 1px solid
		${({ theme, primary }) => (primary ? "transparent" : theme.colors.fg)};
	border-radius: 0.2em;

	cursor: pointer;
	padding: 0.8em 2em;

	transition: all 0.01s ease;

	&:hover {
		background-color: ${({ primary, theme }) =>
			primary ? shade(0.2, theme.colors.brand) : theme.colors.fg};
		color: ${({ primary, theme }) =>
			primary ? theme.colors.fg : theme.colors.bg};
	}
`;

export default Button;
