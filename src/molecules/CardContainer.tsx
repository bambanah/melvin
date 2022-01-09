import styled from "styled-components";

const CardContainer = styled.div`
	flex: 1;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(23rem, auto));
	grid-gap: 3rem;
	justify-content: center;
`;

export default CardContainer;
