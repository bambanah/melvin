import { useRouter } from "next/router";
import React from "react";
import { ClimbingBoxLoader } from "react-spinners";
import styled from "styled-components";
import { useAuth } from "../shared/hooks/useAuth";
import { signOut } from "../shared/utils/firebase";
import Button from "./Button";
import NextLink from "./NavLink";

interface Props {
	children: React.ReactNode;
}

const Header = styled.header`
	display: flex;
	align-items: center;
	justify-content: space-evenly;
	width: 100%;
	height: 5rem;
	padding: 0 5rem;

	background-color: white;
	box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.2);

	.nav-logo,
	.nav-auth {
		flex: 0 0 20%;
	}
`;

const NavLinks = styled.div`
	display: flex;
	flex: 1 0 auto;
	align-items: center;
	justify-content: center;
`;

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
	display: flex;
	width: 800px;
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
	const { user } = useAuth();

	const { authenticated, loadingAuthState } = useAuth();

	if (!authenticated && !loadingAuthState) {
		router.push("/login");
		return <div>Redirecting...</div>;
	}

	return (
		<Container>
			<Header>
				<div className="nav-logo">NDIS</div>
				<NavLinks>
					<NextLink href="/invoices">Invoices</NextLink>
					<NextLink href="/templates">Templates</NextLink>
				</NavLinks>
				<div className="nav-auth">
					{user && <span className="mr-2 mt-2">{user.email}</span>}
					<Button onClick={() => signOut()}>Log Out</Button>
				</div>
			</Header>
			<Content>
				{loadingAuthState ? (
					<SpinnerContainer>
						<ClimbingBoxLoader
							loading={loadingAuthState}
							size={40}
							color="#3d99b4"
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
