import styled from "styled-components";

interface Props {
	flexDirection?: "row" | "column";
}

const Form = styled.form<Props>`
	display: flex;
	flex-wrap: wrap;
	flex-direction: ${(props) => props.flexDirection || "row"};
	gap: 2rem;
`;

export default Form;
