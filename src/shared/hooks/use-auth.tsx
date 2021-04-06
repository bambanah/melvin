import { createContext, useState, useEffect, useContext } from "react";
import { auth } from "../utils/firebase";
import nookies from "nookies";
import firebase from "firebase";

interface AuthProps {
	user: firebase.User | null;
}

export const AuthContext = createContext<AuthProps>({ user: null });

export const AuthProvider: React.FC = ({ children }) => {
	const [user, setUser] = useState<firebase.User | null>(null);

	useEffect(() => {
		return auth.onIdTokenChanged(async (user) => {
			if (!user) {
				setUser(null);
				nookies.set(undefined, "token", "", "");
				return;
			}

			const token = await user.getIdToken();
			setUser(user);
			nookies.set(undefined, "token", token, "");
		});
	});

	return (
		<AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => {
	return useContext(AuthContext);
};
