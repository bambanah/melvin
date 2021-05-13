/* eslint-disable react/button-has-type */
import React, { FunctionComponent } from "react";
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

const BlandButton: FunctionComponent<ButtonProps> = ({
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

const Button = styled(({ ...rest }) => <BlandButton {...rest} />)`
	background-color: white;
	border-color: #dbdbdb;
	border-width: 1px;
	color: #363636;
	cursor: pointer;
	justify-content: center;
	padding-bottom: calc(0.5em - 1px);
	padding-left: 1em;
	padding-right: 1em;
	padding-top: calc(0.5em - 1px);
	text-align: center;
	white-space: nowrap;
`;

export default Button;
