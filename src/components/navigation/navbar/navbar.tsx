import Button from "@atoms/button";
import Display from "@atoms/display";
import NavAuth from "@components/auth/nav-auth";
import NavLink from "@components/navigation/nav-link";
import { faBars, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
					{/* TODO: Uncomment once activity creation is properly implemented */}
					{/* <NavLink href="/activities">Activities</NavLink> */}
					<NavLink href="/invoices">Invoices</NavLink>
					<NavLink href="/support-items">Support Items</NavLink>
					<NavLink href="/clients">Clients</NavLink>
				</Styles.Links>

				<Styles.Right>
					<NavAuth user={session.data?.user as User} />
				</Styles.Right>
			</Styles.Content>
		</Styles.Header>
	);
};

export default Navbar;
