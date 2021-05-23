import styled from "styled-components";

interface LabelProps {
	required?: boolean;
}

const Label = styled.label<LabelProps>`
	display: flex;
	flex-direction: column;
	flex: 1 0 auto;
	gap: 0.4rem;

	span::after {
		color: red;
		content: ${(props) => `"${props.required ? " *" : " "}"`};
	}
`;

export default Label;
