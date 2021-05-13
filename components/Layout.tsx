import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import { ClimbingBoxLoader } from "react-spinners";
import styled from "styled-components";
import { useAuth } from "../shared/hooks/useAuth";

interface Props {
	children: React.ReactNode;
}

const Header = styled.header``;

const Container = styled.div`
	display: flex;
	flex-direction: column;
	width: 1000px;
	min-height: 100vh;
	margin: auto;
`;

const Content = styled.div`
	display: flex;
	width: 100%;
	height: 100%;
	flex: 1 0 auto;
	flex-direction: column;
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
			<Header>
				<Link href="invoices">Invoices</Link>
				<Link href="templates">Templates</Link>
			</Header>
			<Content>
				{loadingAuthState ? (
					<SpinnerContainer>
						<ClimbingBoxLoader
							loading={loadingAuthState}
							size={40}
							color={"#3d99b4"}
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
