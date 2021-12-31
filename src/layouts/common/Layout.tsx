import React from "react";
import styled from "styled-components";
import Navbar from "../../organisms/Navbar";

interface Props {
	children: React.ReactNode;
}

const Container = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	width: 100%;
	min-height: 100vh;
	margin: auto;
`;

const Content = styled.div`
	box-sizing: border-box;
	display: flex;
	width: 95vw;
	max-width: 1200px;
	margin-top: 7rem;
	height: 100%;
	flex: 1 0 auto;
	flex-direction: column;

	@media screen and (max-width: 900px) {
		width: inherit;
	}
`;

const Layout: React.FC<Props> = ({ children }) => (
	<Container>
		<Navbar />

		<Content>{children}</Content>
	</Container>
);

export default Layout;
