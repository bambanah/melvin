import NavAuth from "@molecules/NavAuth";
import NavLink from "@molecules/NavLink";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import NextImage from "next/image";
import React from "react";
import * as Styles from "./styles";

const Navbar = () => {
	const session = useSession();

	return (
		<Styles.Header>
			<Styles.NavContent>
				<Styles.NavLogo>
					<a href="/">
						<NextImage
							src="/ndis-logo.png"
							alt="NDIS Logo"
							width={70}
							height={35}
						/>
					</a>
					<a href="/price-guide-3-21.pdf">Price Guide</a>
				</Styles.NavLogo>

				<Styles.NavLinks>
					<NavLink href="/">Dashboard</NavLink>
					<NavLink href="/invoices">Invoices</NavLink>
					<NavLink href="/activities">Activities</NavLink>
					<NavLink href="/clients">Clients</NavLink>
				</Styles.NavLinks>

				<NavAuth user={session.data?.user as User} />
			</Styles.NavContent>
		</Styles.Header>
	);
};

export default Navbar;
