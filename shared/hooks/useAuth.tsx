import React, { createContext, useState, useEffect, useContext } from "react";
import firebase from "firebase/app";
import { auth } from "../utils/firebase";

interface AuthProps {
	user: firebase.User | null;
	authenticated: boolean;
	loadingAuthState: boolean;
}

export const AuthContext = createContext<Partial<AuthProps>>({
	user: null,
});

export const AuthProvider: React.FC = ({
	children,
}: {
	children?: React.ReactNode;
}) => {
	const [user, setUser] = useState<firebase.User | null>(null);
	const [loadingAuthState, setLoadingAuthState] = useState(true);
	useEffect(() => {
		let isMounted = true;

		auth.onAuthStateChanged(async (firebaseUser) => {
			if (isMounted) {
				setUser(firebaseUser);
				setLoadingAuthState(false);
			}
		});

		return () => {
			isMounted = false;
		};
	});

	return (
		<AuthContext.Provider
			value={{ user, authenticated: user !== null, loadingAuthState }}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
