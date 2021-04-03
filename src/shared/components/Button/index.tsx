import React, { FunctionComponent } from "react";
import { StyledButton } from "./Styles";

type ButtonProps = {
	onClick?: () => void;
	disabled?: boolean;
};

const defaultProps: ButtonProps = {
	onClick: () => {},
	disabled: false,
};

const Button: FunctionComponent<ButtonProps> = React.forwardRef(
	(
		{ children, onClick, disabled },
		ref: React.ForwardedRef<HTMLButtonElement>
	) => {
		const handleClick = () => {
			if (!disabled && onClick) {
				onClick();
			}
		};

		return (
			<StyledButton onClick={handleClick} disabled={disabled}>
				{children}
			</StyledButton>
		);
	}
);

Button.defaultProps = defaultProps;

export default Button;
