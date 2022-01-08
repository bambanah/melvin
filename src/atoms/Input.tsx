import styled from "styled-components";

interface InputProps {
	error?: boolean;
}

const Input = styled.input<InputProps>`
	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};

	padding: 0.8rem 1.6rem;
	border-radius: 0.3rem;
	border: 0.01rem solid transparent;
	outline: none;

	border-color: ${(props) =>
		props.error ? props.theme.colors.error : props.theme.colors.fg};

	&:focus {
		border: 1px solid #6e6e6e;

		border-color: ${({ theme }) => theme.colors.brand};
		box-shadow: 0px 0px 10px ${({ theme }) => theme.colors.brand}88;
	}
`;

export default Input;
