import styled from "styled-components";

export const Header = styled.header`
	position: fixed;
	top: 0;
	width: 100vw;
	box-sizing: border-box;
	z-index: 100;
	background-color: white;
	box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.2);
`;

export const NavContent = styled.div`
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

export const NavLogo = styled.div`
	flex: 0 0 12rem;
	display: flex;
	align-items: center;

	a:last-of-type {
		margin-left: 1rem;
		font-family: "Roboto Mono";
		font-size: 0.8rem;
	}
`;

export const NavLinks = styled.div`
	display: flex;
	flex: 1 0 auto;
	align-items: center;
	justify-content: center;
`;
