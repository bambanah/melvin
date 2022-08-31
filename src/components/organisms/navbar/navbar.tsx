import Button from "@atoms/button";
import Display from "@atoms/display";
import NavLink from "@atoms/nav-link";
import {
	faBars,
	faFileAlt,
	faUser,
	faWalking,
	faX,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import NavAuth from "@molecules/nav-auth";
import ThemeSwitch from "@molecules/theme-switch";
import { User } from "@prisma/client";
import { breakpoints } from "@styles/themes";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useState } from "react";
import { useMediaQuery } from "react-responsive";
import * as Styles from "./styles";

const Navbar = () => {
	const session = useSession();
	const [isExpanded, setIsExpanded] = useState(false);

	const isDesktopScreen = useMediaQuery({ query: breakpoints.desktop });
	const isTabletScreen = useMediaQuery({ query: breakpoints.tablet });

	return (
		<Styles.Header className={isExpanded ? "expanded" : ""}>
			<Link href="/invoices" passHref>
				<a>
					<Display className="xsmall brand">
						m{!isDesktopScreen || isTabletScreen ? "elvin" : ""}
					</Display>
				</a>
			</Link>
			<Button className="nav-toggle" onClick={() => setIsExpanded(!isExpanded)}>
				<FontAwesomeIcon icon={isExpanded ? faX : faBars} />
			</Button>
			<Styles.Content className={isExpanded ? "expanded" : ""}>
				<Styles.Links className={`nav-links`}>
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
