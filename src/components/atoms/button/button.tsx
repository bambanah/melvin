import { ButtonHTMLAttributes } from "react";
import { DefaultTheme, StyledComponent } from "styled-components";
import {
	PrimaryButton,
	SecondaryButton,
	SuccessButton,
	DangerButton,
	BaseButton,
} from "./styles";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "success" | "danger";
	children?: React.ReactNode | React.ReactNode[];
}

const Button: React.FC<Props> = ({
	variant,
	children,
	disabled,
	className,
	...rest
}) => {
	let ButtonComponent: StyledComponent<"button", DefaultTheme>;

	switch (variant) {
		case "primary": {
			ButtonComponent = PrimaryButton;
			break;
		}
		case "secondary": {
			ButtonComponent = SecondaryButton;
			break;
		}
		case "success": {
			ButtonComponent = SuccessButton;
			break;
		}
		case "danger": {
			ButtonComponent = DangerButton;
			break;
		}
		default: {
			ButtonComponent = BaseButton;
		}
	}

	return (
		<ButtonComponent
			className={`${disabled ? "disabled" : ""} ${className}`}
			disabled={disabled}
			{...rest}
		>
			{children}
		</ButtonComponent>
	);
};

export default Button;
