import { useRouter } from "next/router";
import React from "react";
import { ClimbingBoxLoader } from "react-spinners";
import styled from "styled-components";
import { useAuth } from "../hooks/useAuth";
import Navbar from "./Navbar";

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
	/* min-width: 700px; */
	/* 5rem for the header, then 2rem gap */
	margin-top: 7rem;
	height: 100%;
	flex: 1 0 auto;
	flex-direction: column;

	@media screen and (max-width: 900px) {
		width: inherit;
	}
`;

const SpinnerContainer = styled.div`
	flex: 1 0 auto;
	margin-top: 100px;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
`;

const Layout: React.FC<Props> = ({ children }) => {
	const router = useRouter();

	const { authenticated, loadingAuthState } = useAuth();

	if (!authenticated && !loadingAuthState) {
		router.push("/login");
		return <div>Redirecting...</div>;
	}

	return (
		<Container>
			<Navbar />

			<Content>
				{loadingAuthState ? (
					<SpinnerContainer>
						<ClimbingBoxLoader
							loading={loadingAuthState}
							size={40}
							color="#6B2875"
						/>
					</SpinnerContainer>
				) : (
					children
				)}
			</Content>
		</Container>
	);
};

export default Layout;
