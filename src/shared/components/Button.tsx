/* eslint-disable react/button-has-type */
import React, { FunctionComponent } from "react";

interface ButtonProps extends React.HTMLProps<HTMLButtonElement> {
	onClick?: () => void;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	className?: string;
}

const defaultProps: ButtonProps = {
	onClick: () => {},
	disabled: false,
	type: "button",
	className: "button",
};

const Button: FunctionComponent<ButtonProps> = (
	{ children, onClick, disabled, type, className }: ButtonProps,
	...rest
) => {
	const handleClick = () => {
		if (!disabled && onClick) {
			onClick();
		}
	};

	return (
		<button
			onClick={handleClick}
			disabled={disabled}
			type={type}
			className={className}
			{...rest}
		>
			{children}
		</button>
	);
};

Button.defaultProps = defaultProps;

export default Button;
