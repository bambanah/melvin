import styled from "styled-components";

export const Header = styled.header`
	flex: 0 0 15em;
	width: 15em;
	height: 100%;
	box-sizing: border-box;
	z-index: 100;
	background-color: ${({ theme }) => theme.colors.bg};

	@media screen and (max-width: 1200px) {
		flex-basis: 6em;
	}
`;

export const Content = styled.div`
	height: 100%;
	width: 100%;
	padding: 2rem 0;

	box-sizing: border-box;
	margin: auto;

	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-evenly;
`;

export const Links = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1em;
	flex: 1 0 auto;
	align-items: flex-start;
	justify-content: flex-start;
	padding: 3rem 0;
`;

export const Right = styled.div`
	display: flex;
	gap: 1rem;

	@media screen and (max-width: 1200px) {
		flex-direction: column-reverse;
		align-items: center;
	}
`;
