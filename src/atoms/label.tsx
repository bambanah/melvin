import styled from "styled-components";

interface LabelProps {
	required?: boolean;
}

const Label = styled.label<LabelProps>`
	display: flex;
	flex-direction: column;
	flex: 1 0 auto;
	gap: 0.6rem;
	color: ${({ required }) => (required ? "red" : "black")};

	& > span::after {
		color: red;
		content: ${({ required }) => (required ? " *" : " ")};
	}
`;

export default Label;
