import NavAuth from "@molecules/nav-auth";
import NavLink from "@molecules/nav-link";
import ThemeSwitch from "@atoms/theme-switch";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";
import * as Styles from "./styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Navbar = () => {
	const session = useSession();

	return (
		<Styles.Header>
			<Styles.Content>
				<Link href="/" passHref>
					<Styles.Brand>melvin</Styles.Brand>
				</Link>

				<Styles.Links>
					<NavLink href="/">
						<FontAwesomeIcon icon={["fas", "home"]} /> Dashboard
					</NavLink>
					<NavLink href="/invoices">
						<FontAwesomeIcon icon={["fas", "file-alt"]} /> Invoices
					</NavLink>
					<NavLink href="/activities">
						<FontAwesomeIcon icon={["fas", "walking"]} /> Activities
					</NavLink>
					<NavLink href="/clients">
						<FontAwesomeIcon icon={["fas", "user"]} /> Clients
					</NavLink>
				</Styles.Links>

				<Styles.Right>
					<ThemeSwitch />
					<NavAuth user={session.data?.user as User} />
				</Styles.Right>
			</Styles.Content>
		</Styles.Header>
	);
};

export default Navbar;
