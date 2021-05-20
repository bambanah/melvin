import styled from "styled-components";

interface InputProps {
	error?: boolean;
}

const Input = styled.input<InputProps>`
	padding: 0.5rem 0.8rem;
	border-radius: 3px;
	border: 1px solid transparent;
	outline: none;
	box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.15);

	border-color: ${(props) =>
		props.error ? props.theme.colors.error : "transparent"};

	&:focus {
		border: 1px solid #6e6e6e;

		border-color: ${(props) =>
			props.error ? props.theme.colors.error : "transparent"};
	}
`;

export default Input;
