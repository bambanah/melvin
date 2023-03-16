import Loading from "@atoms/loading";
import Navbar from "@components/navigation/navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";

interface Props {
	children: React.ReactNode;
	isLoading?: boolean;
}

const Layout = ({ children, isLoading }: Props) => {
	const session = useSession();
	const router = useRouter();

	let content: React.ReactNode;

	if (session.status === "unauthenticated") {
		router.push("/login");
		content = <p>Redirecting...</p>;
	}

	if (session.status === "loading" || isLoading) {
		content = <Loading />;
	}

	content = children;

	return (
		<div className="flex h-full min-h-screen w-screen flex-col">
			<Navbar />

			<div className="mb-48 flex flex-auto flex-col py-2 md:mb-0 md:p-12">
				{content}
			</div>
		</div>
	);
};

export default Layout;
