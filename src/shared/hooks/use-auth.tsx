import React, { createContext, useState, useEffect, useContext } from "react";
import firebase from "firebase";
import { auth } from "../utils/firebase";

interface AuthProps {
	user: firebase.User | null;
}

export const AuthContext = createContext<AuthProps>({
	user: null,
});

export const AuthProvider: React.FC = ({
	children,
}: {
	children?: React.ReactNode;
}) => {
	const [user, setUser] = useState<firebase.User | null>(null);
	const [loading, setLoading] = useState(true);
	useEffect(() =>
		auth.onIdTokenChanged(async (firebaseUser) => {
			if (firebaseUser) {
				setUser(firebaseUser);
			} else {
				setUser(null);
			}

			setLoading(false);
		})
	);

	if (loading) {
		return <div>Loading...</div>;
	}
	return (
		<AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
