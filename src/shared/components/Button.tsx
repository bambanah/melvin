/* eslint-disable react/button-has-type */
import React, { FunctionComponent } from "react";

interface ButtonProps extends React.HTMLProps<HTMLButtonElement> {
	onClick?: () => void;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
}

const defaultProps: ButtonProps = {
	onClick: () => {},
	disabled: false,
};

const Button: FunctionComponent<ButtonProps> = ({
	children,
	onClick,
	disabled,
	type,
	...rest
}: ButtonProps) => {
	const handleClick = (e: React.MouseEvent) => {
		// Stop parent click function from triggering (load invoice)
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

Button.defaultProps = defaultProps;

export default Button;
