import Button from "@atoms/button";
import Display from "@atoms/display";
import NavAuth from "@components/auth/nav-auth";
import NavLink from "@components/navigation/nav-link";
import { faBars, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
				<div className="flex h-full w-full flex-col gap-1 pt-12 text-2xl md:mt-2 md:flex-row md:content-end md:items-end md:gap-3 md:p-0 md:text-base">
					<NavLink href="/activities">Activities</NavLink>
					<NavLink href="/invoices">Invoices</NavLink>
					<NavLink href="/support-items">Support Items</NavLink>
					<NavLink href="/clients">Clients</NavLink>
				</div>

				<NavAuth user={session.data?.user} />
			</Styles.Content>
		</Styles.Header>
	);
};

export default Navbar;
