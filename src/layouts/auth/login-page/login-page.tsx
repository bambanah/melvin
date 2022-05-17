import Button from "@atoms/button";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import LoginForm from "@molecules/login-form";
import { Brand } from "@organisms/navbar/styles";
import { BuiltInProviderType } from "next-auth/providers";
import { ClientSafeProvider, LiteralUnion, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
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
		<Styles.Container>
			<Styles.Modal>
				<Brand>melvin</Brand>

				<LoginForm />

				<p>
					Don&#39;t have an account? <a>Sign up</a>
				</p>

				<Styles.Separator>
					<span>OR</span>
				</Styles.Separator>

				{Object.values(providers).map((provider) => (
					<Button
						onClick={() => signIn(provider.id, { callbackUrl })}
						key={provider.id}
					>
						<FontAwesomeIcon icon={faGoogle} />
						Continue with {provider.name}
					</Button>
				))}
			</Styles.Modal>
		</Styles.Container>
	);
};

export default LoginPage;
