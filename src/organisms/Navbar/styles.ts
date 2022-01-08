import styled from "styled-components";

export const Header = styled.header`
	position: fixed;
	top: 0;
	width: 100vw;
	box-sizing: border-box;
	z-index: 100;
	background-color: ${({ theme }) => theme.colors.bg};
	box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.2);
`;

export const Brand = styled.a`
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
	height: 5rem;
	width: 100%;
	padding: 0 2rem;
	min-width: 700px;
	max-width: 1100px;

	box-sizing: border-box;
	margin: auto;

	display: flex;
	align-items: center;
	justify-content: space-evenly;
`;

export const Links = styled.div`
	display: flex;
	flex: 1 0 auto;
	align-items: center;
	justify-content: center;
`;
