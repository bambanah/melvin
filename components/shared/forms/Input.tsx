import styled from "styled-components";

const Input = styled.input`
	padding: 0.5rem 0.8rem;
	border-radius: 3px;
	border: 1px solid transparent;
	outline: none;
	box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.15);

	&:focus {
		border: 1px solid #6e6e6e;
	}
`;

export default Input;
