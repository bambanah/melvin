import NavAuth from "@molecules/NavAuth";
import NavLink from "@molecules/NavLink";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";
import * as Styles from "./styles";

const Navbar = () => {
	const session = useSession();

	return (
		<Styles.Header>
			<Styles.Content>
				<Link href="/">
					<Styles.Brand>melvin</Styles.Brand>
				</Link>

				<Styles.Links>
					<NavLink href="/">Dashboard</NavLink>
					<NavLink href="/invoices">Invoices</NavLink>
					<NavLink href="/activities">Activities</NavLink>
					<NavLink href="/clients">Clients</NavLink>
				</Styles.Links>

				<NavAuth user={session.data?.user as User} />
			</Styles.Content>
		</Styles.Header>
	);
};

export default Navbar;
