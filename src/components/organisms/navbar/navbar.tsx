import Button from "@atoms/button";
import Display from "@atoms/display";
import NavLink from "@atoms/nav-link";
import {
	faBars,
	faFileAlt,
	faUser,
	faWalking,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import NavAuth from "@molecules/nav-auth";
import ThemeSwitch from "@molecules/theme-switch";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useState } from "react";
import * as Styles from "./styles";

const Navbar = () => {
	const session = useSession();
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<Styles.Header className={isExpanded ? "expanded" : ""}>
			<Button className="nav-toggle" onClick={() => setIsExpanded(!isExpanded)}>
				<FontAwesomeIcon icon={faBars} />
			</Button>
			<Styles.Content>
				<Link href="/invoices" passHref>
					<a>
						<Display className="xsmall brand">melvin</Display>
					</a>
				</Link>

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
