import { useRouter } from "next/router";
import React from "react";
import { ClimbingBoxLoader } from "react-spinners";
import styled from "styled-components";
import Image from "next/image";
import { useAuth } from "../shared/hooks/useAuth";
import { signOut } from "../shared/utils/firebase";
import Button from "./Button";
import NavLink from "./NavLink";

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
`;

const NavLogo = styled.div`
	flex: 0 0 20%;
`;

const NavLinks = styled.div`
	display: flex;
	flex: 1 0 auto;
	align-items: center;
	justify-content: center;
`;

const NavAuth = styled.div`
	flex: 0 0 20%;
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
	width: 90vw;
	max-width: 1200px;
	min-width: 800px;
	margin-top: 4rem;
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
				<NavLogo>
					<a href="https://www.ndis.gov.au/providers/price-guides-and-pricing#ndis-price-guide-2020-21">
						<Image
							src="/ndis-logo.png"
							alt="NDIS Logo"
							width={70}
							height={35}
						/>
					</a>
				</NavLogo>

				<NavLinks>
					<NavLink href="/invoices">Invoices</NavLink>
					<NavLink href="/templates">Templates</NavLink>
				</NavLinks>

				<NavAuth>
					{user && <span className="mr-2 mt-2">{user.email}</span>}
					<Button onClick={() => signOut()}>Log Out</Button>
				</NavAuth>
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
