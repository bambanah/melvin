import React, { FunctionComponent } from "react";
import styled from "styled-components";

const StyledButton = styled.button<{ primary?: boolean }>`
	display: inline-block;
	border: 2px solid var(--color-dark);
	padding: 0.5rem 1rem;
	border-radius: 0px;
	background: none;
	cursor: pointer;
	transition-duration: 0.1s;
	max-height: 37px;

	border-color: ${(props) =>
		props.primary ? "var(--color-primary-dark)" : "var(--color-dark)"};
	color: ${(props) => (props.primary ? "var(--color-primary-dark)" : "#000")};

	&:hover {
		background-color: var(--color-dark);
		color: var(--color-light);
	}
`;

interface ButtonProps extends React.HTMLProps<HTMLButtonElement> {
	onClick?: () => void;
	disabled?: boolean;
	primary?: boolean;
}

const defaultProps: ButtonProps = {
	onClick: () => {},
	disabled: false,
	primary: false,
};

const Button: FunctionComponent<ButtonProps> = ({
	children,
	onClick,
	disabled,
	primary,
}: ButtonProps) => {
	const handleClick = () => {
		if (!disabled && onClick) {
			onClick();
		}
	};

	return (
		<StyledButton onClick={handleClick} disabled={disabled} primary={primary}>
			{children}
		</StyledButton>
	);
};

Button.defaultProps = defaultProps;

export default Button;
