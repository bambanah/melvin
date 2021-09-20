import { GetServerSideProps } from "next";
import { BuiltInProviderType } from "next-auth/providers";
import {
	ClientSafeProvider,
	getProviders,
	LiteralUnion,
	signIn,
} from "next-auth/react";
import React from "react";
import Button from "../shared/components/Button";

export default function Login({
	providers,
}: {
	providers: Record<
		LiteralUnion<BuiltInProviderType, string>,
		ClientSafeProvider
	>;
}) {
	return (
		<div className="section">
			<div className="container">
				<h1 className="title">Login</h1>
				{Object.values(providers).map((provider) => (
					<Button onClick={signIn(provider.id)} key={provider.id}>
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
