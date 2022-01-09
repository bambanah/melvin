import styled from "styled-components";

const CardContainer = styled.div`
	flex: 1;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(23em, auto));
	grid-gap: 3em;
	justify-content: center;

	@media only screen and (max-width: 1600px) {
		font-size: 14px;
	}
`;

export default CardContainer;
