import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import AuthModal from "@/components/auth/auth-modal";
import LoginForm from "@/components/auth/login-form";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BuiltInProviderType } from "next-auth/providers";
import { ClientSafeProvider, LiteralUnion, signIn } from "next-auth/react";
import { useRouter } from "next/router";

interface LoginPageProps {
	providers: Record<
		LiteralUnion<BuiltInProviderType, string>,
		ClientSafeProvider
	>;
}

const LoginPage = ({ providers }: LoginPageProps) => {
	const router = useRouter();

	let callbackUrl = String(router.query.callbackUrl ?? "/dashboard");

	if (router.query.callbackUrl === "/login") callbackUrl = "/dashboard";

	return (
		<AuthModal>
			<Logo variant="MEDIUM">melvin</Logo>
			<p>Sign in to continue</p>

			<LoginForm />

			<div className="flex w-full flex-nowrap items-center justify-center gap-4 text-sm text-neutral-800 before:grow before:border-t before:border-neutral-300 before:content-[''] after:grow after:border-t after:border-neutral-300 after:content-['']">
				OR
			</div>

			{providers &&
				Object.values(providers)
					.filter((provider) => provider.id !== "email")
					.map((provider) => (
						<Button
							onClick={() => signIn(provider.id, { callbackUrl })}
							key={provider.id}
							variant="outline"
							className="w-full"
						>
							<FontAwesomeIcon icon={faGoogle} className="mr-2 h-4 w-4" />
							Sign in with {provider.name}
						</Button>
					))}
		</AuthModal>
	);
};

export default LoginPage;
