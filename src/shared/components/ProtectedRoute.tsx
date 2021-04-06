import React from "react";
import { Redirect, Route, RouteProps } from "react-router";
import { useAuth } from "../hooks/use-auth";

const ProtectedRoute: React.FC<RouteProps> = ({ component, ...rest }) => {
	const auth = useAuth();

	return (
		<Route
			render={() => {
				console.log(auth.user);
				if (auth.user) {
					return { component };
				} else {
					return <Redirect to="/login" />;
				}
			}}
			{...rest}
		/>
	);
};

export default ProtectedRoute;
