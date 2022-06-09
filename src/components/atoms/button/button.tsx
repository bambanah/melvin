import { transparentize } from "polished";
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

		border-color: ${({ theme }) => transparentize(0.8, theme.colors.fg)};

		color: ${({ theme }) => theme.colors.fg}77;
		background-color: ${({ theme }) => transparentize(0.2, theme.colors.bg)};

		&:hover {
			transform: none;
			box-shadow: none;
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
	}
`;

const SecondaryButton = styled(BaseButton)`
	color: ${({ theme }) => theme.colors.bg};
	background-color: ${({ theme }) => theme.colors.fg};

	&.disabled {
		color: ${({ theme }) => transparentize(0.3, theme.colors.bg)};
		background-color: ${({ theme }) => transparentize(0.8, theme.colors.fg)};
	}
`;

const SuccessButton = styled(BaseButton)`
	color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.fg : theme.colors.bg};
	background-color: ${({ theme }) => theme.colors.green};

	&.disabled {
		color: ${({ theme }) =>
			transparentize(
				0.3,
				theme.type === "light" ? theme.colors.fg : theme.colors.bg
			)};
		background-color: ${({ theme }) => transparentize(0.8, theme.colors.green)};
	}
`;

const DangerButton = styled(BaseButton)`
	color: ${({ theme }) =>
		theme.type === "light" ? theme.colors.bg : theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.error};

	&.disabled {
		color: ${({ theme }) =>
			transparentize(
				0.3,
				theme.type === "light" ? theme.colors.bg : theme.colors.fg
			)};
		background-color: ${({ theme }) => transparentize(0.8, theme.colors.error)};
	}
`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "success" | "danger";
	children?: React.ReactNode | React.ReactNode[];
}

const Button: React.FC<Props> = ({
	variant,
	children,
	disabled,
	onClick,
	...rest
}) => {
	let ButtonComponent: StyledComponent<"button", DefaultTheme>;

	switch (variant) {
		case "primary":
			ButtonComponent = PrimaryButton;
			break;
		case "secondary":
			ButtonComponent = SecondaryButton;
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
		<ButtonComponent
			className={disabled ? "disabled" : ""}
			onClick={!disabled ? onClick : undefined}
			{...rest}
		>
			{children}
		</ButtonComponent>
	);
};

export default Button;
