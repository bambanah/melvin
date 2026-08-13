import LoginPage from "@/components/auth/login-page";
import { auth } from "@/server/auth";
import { fromNodeHeaders } from "better-auth/node";
import { GetServerSideProps } from "next";

export default function Login() {
	return <LoginPage />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(context.req.headers)
	});

	if (session) {
		return {
			redirect: {
				destination: "/dashboard/invoices",
				permanent: false
			}
		};
	}

	return { props: {} };
};
