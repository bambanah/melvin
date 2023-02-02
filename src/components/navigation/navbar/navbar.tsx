import Button from "@atoms/button";
import Display from "@atoms/display";
import NavLink from "@components/navigation/nav-link";
import { faBars, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import NavAuth from "@components/auth/nav-auth";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import * as Styles from "./navbar.styles";

const Navbar = () => {
	const session = useSession();
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<Styles.Header className={isExpanded ? "expanded" : ""}>
			<Link href="/invoices">
				<Display className="xsmall brand">melvin</Display>
			</Link>
			<Button className="nav-toggle" onClick={() => setIsExpanded(!isExpanded)}>
				<FontAwesomeIcon icon={isExpanded ? faX : faBars} />
			</Button>
			<Styles.Content className={isExpanded ? "expanded" : ""}>
				<Styles.Links className={`nav-links`}>
					<NavLink href="/activities">
						<span>Activities</span>
					</NavLink>
					<NavLink href="/invoices">
						<span>Invoices</span>
					</NavLink>
					<NavLink href="/support-items">
						<span>Support Items</span>
					</NavLink>
					<NavLink href="/clients">
						<span>Clients</span>
					</NavLink>
				</Styles.Links>

				<Styles.Right>
					<NavAuth user={session.data?.user as User} />
				</Styles.Right>
			</Styles.Content>
		</Styles.Header>
	);
};

export default Navbar;
