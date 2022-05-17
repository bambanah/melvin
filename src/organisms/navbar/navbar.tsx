import NavAuth from "@molecules/nav-auth";
import NavLink from "@atoms/nav-link";
import ThemeSwitch from "@molecules/theme-switch";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";
import * as Styles from "./styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Display from "@atoms/display";
import {
	faFileAlt,
	faUser,
	faWalking,
} from "@fortawesome/free-solid-svg-icons";

const Navbar = () => {
	const session = useSession();

	return (
		<Styles.Header>
			<Styles.Content>
				<Link href="/dashboard/invoices" passHref>
					<a>
						<Display className="xsmall brand">melvin</Display>
					</a>
				</Link>

				<Styles.Links>
					<NavLink href="/dashboard/invoices">
						<FontAwesomeIcon icon={faFileAlt} /> Invoices
					</NavLink>
					<NavLink href="/dashboard/activities">
						<FontAwesomeIcon icon={faWalking} /> Activities
					</NavLink>
					<NavLink href="/dashboard/clients">
						<FontAwesomeIcon icon={faUser} /> Clients
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
