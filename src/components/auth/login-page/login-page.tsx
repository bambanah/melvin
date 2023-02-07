import Button from "@atoms/button";
import Display from "@atoms/display";
import LoginForm from "@components/auth/login-form";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BuiltInProviderType } from "next-auth/providers";
import { ClientSafeProvider, LiteralUnion, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import AuthModal from "../auth-modal";
import * as Styles from "./styles";

interface LoginPageProps {
	providers: Record<
		LiteralUnion<BuiltInProviderType, string>,
		ClientSafeProvider
	>;
}

const LoginPage = ({ providers }: LoginPageProps) => {
	const router = useRouter();

	let callbackUrl = String(router.query.callbackUrl ?? "/");

	if (router.query.callbackUrl === "/login") callbackUrl = "/";

	return (
		<AuthModal>
			<Display>melvin</Display>
			<p>Sign in to continue</p>

			<LoginForm />

			<Styles.Separator>OR</Styles.Separator>

			{providers &&
				Object.values(providers)
					.filter((provider) => provider.id !== "email")
					.map((provider) => (
						<Button
							onClick={() => signIn(provider.id, { callbackUrl })}
							key={provider.id}
						>
							<FontAwesomeIcon icon={faGoogle} />
							Sign in with {provider.name}
						</Button>
					))}
		</AuthModal>
	);
};

export default LoginPage;
