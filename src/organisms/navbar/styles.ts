import styled from "styled-components";

export const Header = styled.header`
	top: 0;
	width: 15em;
	height: 100%;
	box-sizing: border-box;
	z-index: 100;
	background-color: ${({ theme }) => theme.colors.bg};
`;

export const Brand = styled.span`
	cursor: pointer;
	user-select: none;
	flex: 0 0 auto;
	font-size: 2.2rem;
	font-weight: bold;
	font-family: "Patua One";
	color: ${({ theme }) => theme.colors.brand};

	&:hover {
		color: ${({ theme }) => theme.colors.brand};
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
	justify-content: center;
`;

export const Right = styled.div`
	display: flex;
	gap: 1rem;
`;
