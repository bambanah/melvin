import AuthModal from "@/components/auth/auth-modal";
import LoginForm from "@/components/auth/login-form";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/router";

const LoginPage = () => {
	const router = useRouter();

	let callbackUrl = String(router.query.callbackUrl ?? "/dashboard");

	if (router.query.callbackUrl === "/login") callbackUrl = "/dashboard";

	return (
		<AuthModal>
			<Logo variant="MEDIUM">melvin</Logo>
			<p>Sign in to continue</p>

			<LoginForm callbackUrl={callbackUrl} />

			<div className="text-foreground before:border-foreground/50 after:border-foreground/50 flex w-full flex-nowrap items-center justify-center gap-4 text-sm before:grow before:border-t before:content-[''] after:grow after:border-t after:content-['']">
				OR
			</div>

			<Button
				onClick={() =>
					authClient.signIn.social({
						provider: "google",
						callbackURL: callbackUrl
					})
				}
				variant="outline"
				className="w-full"
			>
				<Icons.google className="mr-2 h-4 w-4 fill-current" />
				Sign in with Google
			</Button>
		</AuthModal>
	);
};

export default LoginPage;
