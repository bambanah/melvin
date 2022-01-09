import styled from "styled-components";

export const Container = styled.div`
	padding: 3rem 0;
	flex-grow: 1;
	display: flex;
	justify-content: center;
	align-items: center;

	height: 100%;
`;

export const SupportItemList = styled.div`
	flex: 1;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(23rem, auto));
	grid-gap: 3rem;
	justify-content: center;
`;
