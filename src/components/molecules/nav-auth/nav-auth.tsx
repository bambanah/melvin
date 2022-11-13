import Button from "@atoms/button";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { User } from "@prisma/client";
import { signOut } from "next-auth/react";
import React from "react";

import * as Styles from "./nav-auth.styles";

interface NavAuthProps {
	user: User | undefined;
}

const NavAuth: React.FC<NavAuthProps> = ({ user }) => {
	return (
		<Styles.AuthDropdown tabIndex={0}>
			<Styles.Profile>
				<FontAwesomeIcon icon={faCog} title="Clients" />
			</Styles.Profile>
			<Styles.DropdownContent>
				{user && <span>{user.email}</span>}
				<a href="/price-guide-3-21.pdf">Price Guide</a>
				<Button
					onClick={() => {
						signOut();
					}}
				>
					Log Out
				</Button>
			</Styles.DropdownContent>
		</Styles.AuthDropdown>
	);
};

export default NavAuth;
