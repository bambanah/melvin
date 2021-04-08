import { createContext, useState, useEffect, useContext } from "react";
import { auth } from "../utils/firebase";
import firebase from "firebase";

interface AuthProps {
	user: firebase.User | null;
}

export const AuthContext = createContext<AuthProps>({
	user: null,
});

export const AuthProvider: React.FC = ({ children }) => {
	const [user, setUser] = useState<firebase.User | null>(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		return auth.onIdTokenChanged(async (user) => {
			console.log(user);
			if (user) {
				// const token = await user.getIdToken();
				setUser(user);
			} else {
				setUser(null);
			}

			setLoading(false);
		});
	});

	if (loading) {
		return <div>Loading...</div>;
	} else {
		return (
			<AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
		);
	}
};

export const useAuth = () => {
	return useContext(AuthContext);
};
