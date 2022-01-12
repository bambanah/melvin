import styled from "styled-components";

export const Container = styled.div`
	padding: 3em 0;
	flex-grow: 1;
	display: flex;
	justify-content: center;
	align-items: center;

	height: 100%;

	@media only screen and (max-width: 1600px) {
		padding: 1em 0;
	}
`;
