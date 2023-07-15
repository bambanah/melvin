import LoginPage from "@components/auth/login-page";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getProviders, getSession } from "next-auth/react";

export default function Login({
	providers,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	return <LoginPage providers={providers} />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await getSession(context);

	if (session) {
		return {
			redirect: {
				destination: "/dashboard/invoices",
				permanent: false,
			},
		};
	}

	const providers = await getProviders();

	return {
		props: {
			providers,
		},
	};
};
