import React from "react";
import { Redirect, Route, RouteProps } from "react-router";
import { useAuth } from "../hooks/use-auth";

const ProtectedRoute: React.FC<RouteProps> = ({ ...rest }) => {
	const auth = useAuth();

	if (auth.user) {
		return <Route {...rest} />;
	} else {
		return <Redirect to="/login" />;
	}
};

export default ProtectedRoute;
