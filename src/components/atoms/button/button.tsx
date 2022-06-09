import { desaturate } from "polished";
import { ButtonHTMLAttributes } from "react";
import styled, { DefaultTheme, StyledComponent } from "styled-components";

const BaseButton = styled.button`
	display: inline-block;

	font-size: 1rem;
	font-weight: bold;

	cursor: pointer;
	padding: 0.6em 1.7em;

	transition: all 0.1s ease;

	border: 1px solid ${({ theme }) => theme.colors.fg};

	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};

	&:hover,
	&.raised {
		transform: translate(-0.21rem, -0.2rem);
		box-shadow: 0.2rem 0.2rem #000;
	}

	&.disabled {
		cursor: auto;

		border-color: ${({ theme }) => theme.colors.fg}77;

		color: ${({ theme }) => theme.colors.fg}77;
		background-color: ${({ theme }) => desaturate(0.1, theme.colors.bg)};

		&:hover {
			transform: translate(-0.21rem, -0.2rem);
			box-shadow: 0.2rem 0.2rem #000;
		}
	}
`;

const PrimaryButton = styled(BaseButton)`
	color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.bg : theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.brand};

	&.disabled {
		color: ${({ theme }) => theme.colors.bg}77;
		background-color: ${({ theme }) => theme.colors.brand}77;

		&:hover {
			color: ${({ theme }) => theme.colors.bg}77;
			background-color: ${({ theme }) => theme.colors.brand}77;
		}
	}
`;

const SuccessButton = styled(BaseButton)`
	color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.fg : theme.colors.bg};
	background-color: ${({ theme }) => theme.colors.green};
`;

const DangerButton = styled(BaseButton)`
	background-color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.bg : theme.colors.fg};
	color: ${({ theme }) => theme.colors.error};
	border-color: ${({ theme }) => theme.colors.error};
`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "success" | "danger";
	children?: React.ReactNode | React.ReactNode[];
}

const Button: React.FC<Props> = ({ variant, children, disabled, ...rest }) => {
	let ButtonComponent: StyledComponent<"button", DefaultTheme>;

	switch (variant) {
		case "primary":
			ButtonComponent = PrimaryButton;
			break;
		case "success":
			ButtonComponent = SuccessButton;
			break;
		case "danger":
			ButtonComponent = DangerButton;
			break;
		default:
			ButtonComponent = BaseButton;
	}

	return (
		<ButtonComponent className={disabled ? ".disabled" : ""} {...rest}>
			{children}
		</ButtonComponent>
	);
};

export default Button;
