import Button from "@atoms/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import LoginForm from "@molecules/LoginForm";
import { Brand } from "@organisms/Navbar/styles";
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
						<FontAwesomeIcon icon={["fab", "google"]} />
						Continue with {provider.name}
					</Button>
				))}
			</Styles.Modal>
		</Styles.Container>
	);
};

export default LoginPage;
