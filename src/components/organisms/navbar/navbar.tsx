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
import { useMediaQuery } from "react-responsive";

const Navbar = () => {
	const session = useSession();
	const isSmallScreen = useMediaQuery({ query: "(max-width: 1200px)" });

	return (
		<Styles.Header>
			<Styles.Content>
				<Link href="/invoices" passHref>
					<a>
						<Display className="xsmall brand">
							{isSmallScreen ? "m" : "melvin"}
						</Display>
					</a>
				</Link>

				<Styles.Links>
					<NavLink href="/invoices">
						<FontAwesomeIcon icon={faFileAlt} title="Invoices" />{" "}
						<span>Invoices</span>
					</NavLink>
					<NavLink href="/activities">
						<FontAwesomeIcon icon={faWalking} title="Activities" />{" "}
						<span>Activities</span>
					</NavLink>
					<NavLink href="/clients">
						<FontAwesomeIcon icon={faUser} title="Clients" />{" "}
						<span>Clients</span>
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
