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

const Button = styled(({ primary, ...rest }) => <BlandButton {...rest} />)`
	font-family: "Inter";
	font-size: 1rem;
	height: 2.5em;
	background-color: white;
	border: 1px solid #dbdbdb;
	border-radius: 4px;
	color: #363636;
	cursor: pointer;
	padding-bottom: calc(0.5em - 1px);
	padding-left: 1em;
	padding-right: 1em;
	padding-top: calc(0.5em - 1px);
	display: inline-block;

	transition: all 0.05s ease;

	&:hover {
		background-color: #f0f0f0;
		border-color: #cbcbcb;
	}

	${(props) => {
		if (props.primary) {
			return `
				background-color: #00d1b2;
				border-color: transparent;
				color: #fff;

				&:hover {
					background-color: #00c4a7;
				}
			`;
		}

		return null;
	}}
`;

export default Button;
