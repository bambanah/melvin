import Heading from "@/components/ui/heading";
import Logo from "@/components/ui/logo";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Link from "next/link";

const DashboardPage = () => {
	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col items-stretch">
			<nav className="flex items-center justify-between px-8 py-4">
				<Logo>melvin</Logo>
				<ul className="flex items-center gap-4">
					<li>
						<Link href="/login">Log In</Link>
					</li>
					<li>
						<Link href="/signup">Sign Up</Link>
					</li>
				</ul>
			</nav>
			<div className="flex flex-col items-center justify-center gap-8 pt-32">
				<Heading>Welcome!</Heading>
				<p>There&#39;s not much here right now, but come back later.</p>
			</div>
		</main>
	);
};

export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await getSession(context);

	if (session) {
		return {
			redirect: {
				destination: "/dashboard",
				permanent: false,
			},
		};
	}

	return {
		props: {},
	};
};

export default DashboardPage;
