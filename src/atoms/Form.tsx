import styled from "styled-components";

interface Props {
	flexDirection?: "row" | "column";
}

const Form = styled.form<Props>`
	display: flex;
	flex-wrap: wrap;
	flex-direction: ${(props) => props.flexDirection || "row"};
	align-items: stretch;
	gap: 1.5rem;
`;

export default Form;
