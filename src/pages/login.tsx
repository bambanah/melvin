import LoginPage from "@/components/auth/login-page";
import { getServerAuthSession } from "@/server/auth";
import { GetServerSideProps } from "next";

export default function Login() {
	return <LoginPage />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await getServerAuthSession(context.req);

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
