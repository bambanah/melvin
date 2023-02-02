import LoginPage from "@components/auth/login-page";
import { GetServerSideProps } from "next";
import { BuiltInProviderType } from "next-auth/providers";
import {
	ClientSafeProvider,
	getProviders,
	LiteralUnion,
} from "next-auth/react";
import React from "react";

interface LoginProps {
	providers: Record<
		LiteralUnion<BuiltInProviderType, string>,
		ClientSafeProvider
	>;
}

export default function Login({ providers }: LoginProps) {
	return <LoginPage providers={providers} />;
}

export const getServerSideProps: GetServerSideProps = async () => {
	const providers = await getProviders();

	return {
		props: {
			providers,
		},
	};
};
