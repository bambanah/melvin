import React from "react";
import styled from "styled-components";
import Image from "next/image";
import { useAuth } from "../hooks/useAuth";
import { signOut } from "../utils/firebase";
import Button from "./Button";
import NavLink from "../../components/NavLink";

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

const Navbar = () => {
	const { user } = useAuth();

	return (
		<Header>
			<NavContent>
				<NavLogo>
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
					{/* <NavLink href="/templates">Templates</NavLink> */}
					<NavLink href="/activities">Activities</NavLink>
				</NavLinks>

				<NavAuth>
					{user && <span className="mr-2 mt-2">{user.email}</span>}
					<Button onClick={() => signOut()}>Log Out</Button>
				</NavAuth>
			</NavContent>
		</Header>
	);
};

export default Navbar;
