import React from "react";
import { useHistory } from "react-router-dom";
import Button from "../../shared/components/Button";
import { signIn } from "../../shared/utils/firebase";

export default function Login() {
	const history = useHistory();
	const handleClick = () => {
		signIn().then(() => {
			history.push("/");
		});
	};

	return (
		<div className="section">
			<div className="container">
				<h1 className="title">Login</h1>
				<Button onClick={handleClick}>Login</Button>
			</div>
		</div>
	);
}
