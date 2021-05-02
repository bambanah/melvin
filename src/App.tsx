import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Login from "./components/auth/Login";
import NotFound from "./components/NotFound";
import Home from "./Home";
import GlobalStyle from "./shared/GlobalStyle";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import { AuthProvider } from "./shared/hooks/use-auth";

function App() {
	return (
		<AuthProvider>
			<GlobalStyle />
			<Router>
				<Switch>
					<ProtectedRoute exact path="/" component={Home} />
					<Route exact path="/login" component={Login} />
					<Route exact path="*" component={NotFound} />
				</Switch>
			</Router>
		</AuthProvider>
	);
}

export default App;
