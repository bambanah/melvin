import React from "react";
import { Redirect, Route, RouteProps } from "react-router-dom";
import { useAuth } from "../shared/hooks/useAuth";

const ProtectedRoute: React.FC<RouteProps> = ({ ...rest }) => {
	const auth = useAuth();

	if (auth.user) {
		return <Route {...rest} />;
	}
	return <Redirect to="/login" />;
};

export default ProtectedRoute;
