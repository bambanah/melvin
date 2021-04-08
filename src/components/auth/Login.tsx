import { useHistory } from "react-router";
import { signIn } from "../../shared/utils/firebase";

export default function Login() {
	let history = useHistory();
	const handleClick = () => {
		signIn().then(() => {
			history.push("/");
		});
	};

	return (
		<div>
			<h1>Login</h1>
			<button onClick={handleClick}>Login</button>
		</div>
	);
}
