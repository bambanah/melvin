import { GetServerSideProps } from "next";
import { BuiltInProviderType } from "next-auth/providers";
import {
	ClientSafeProvider,
	getProviders,
	LiteralUnion,
	signIn,
} from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import Button from "src/atoms/Button";

export default function Login({
	providers,
}: {
	providers: Record<
		LiteralUnion<BuiltInProviderType, string>,
		ClientSafeProvider
	>;
}) {
	const router = useRouter();

	let callbackUrl: string;
	if (router.query.callbackUrl) {
		callbackUrl =
			typeof router.query.callbackUrl === "string"
				? router.query.callbackUrl
				: router.query.callbackUrl[0];
	}

	return (
		<div className="section">
			<div className="container">
				<h1 className="title">Login</h1>
				{Object.values(providers).map((provider) => (
					<Button
						onClick={() => signIn(provider.id, { callbackUrl })}
						key={provider.id}
					>
						Login with {provider.name}
					</Button>
				))}
			</div>
		</div>
	);
}

export const getServerSideProps: GetServerSideProps = async () => {
	const providers = await getProviders();

	return {
		props: {
			providers,
		},
	};
};
