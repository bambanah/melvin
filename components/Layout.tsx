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
	position: fixed;
	top: 0;
	width: 100vw;
	box-sizing: border-box;
	z-index: 100;
	background-color: white;
	box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.2);
`;

const NavContent = styled.div`
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

const NavLogo = styled.div`
	flex: 0 0 30%;
	display: flex;
	align-items: center;

	a:last-of-type {
		margin-left: 1rem;
		font-family: "Roboto Mono";
		font-size: 0.8rem;
	}
`;

const NavLinks = styled.div`
	display: flex;
	flex: 1 0 auto;
	align-items: center;
	justify-content: center;
`;

const NavAuth = styled.div`
	flex: 0 0 30%;
	text-align: right;

	span {
		margin-right: 0.3rem;
	}

	@media only screen and (max-width: 950px) {
		span {
			display: none;
		}
	}
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
	box-sizing: border-box;
	display: flex;
	width: 100vw;
	padding: 0 2.5vw;
	max-width: 1200px;
	min-width: 700px;
	/* 5rem for the header, then 2rem gap */
	margin-top: 7rem;
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
				<NavContent>
					<NavLogo>
						{/* <a href="https://www.ndis.gov.au/providers/price-guides-and-pricing#ndis-price-guide-2020-21"> */}
						<a href="/">
							<Image
								src="/ndis-logo.png"
								alt="NDIS Logo"
								width={70}
								height={35}
							/>
						</a>
						<a href="/price-guide-3-21.pdf">Price Guide</a>
					</NavLogo>

					<NavLinks>
						<NavLink href="/invoices">Invoices</NavLink>
						<NavLink href="/templates">Templates</NavLink>
					</NavLinks>

					<NavAuth>
						{user && <span className="mr-2 mt-2">{user.email}</span>}
						<Button onClick={() => signOut()}>Log Out</Button>
					</NavAuth>
				</NavContent>
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
