import { User } from "@prisma/client";
import { signOut } from "next-auth/react";
import React from "react";

import * as Styles from "./styles";

interface NavAuthProps {
	user: User;
}

const NavAuth: React.FC<NavAuthProps> = ({ user }) => {
	return (
		<Styles.AuthDropdown tabIndex={0}>
			<Styles.Profile>
				{user.email?.charAt(0).toUpperCase() ?? ""}
			</Styles.Profile>
			<Styles.DropdownContent>
				{user && <span>{user.email}</span>}
				<button onClick={() => signOut()}>Log Out</button>
			</Styles.DropdownContent>
		</Styles.AuthDropdown>
	);
};

export default NavAuth;
