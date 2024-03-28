import Navbar from "@/components/navigation/navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import SkeletonLayout from "./skeleton-layout";

interface Props {
	children: React.ReactNode;
	isLoading?: boolean;
}

const Layout = ({ children, isLoading }: Props) => {
	const session = useSession();
	const router = useRouter();

	let content: ReactNode;

	if (session.status === "unauthenticated") {
		content = <p>Redirecting...</p>;
		router.push("/");
	} else if (session.status === "loading" || isLoading) {
		content = <SkeletonLayout />;
	} else {
		content = children;
	}

	return (
		<div className="flex h-full min-h-screen w-full flex-col">
			<Navbar />

			<div className="flex flex-auto flex-col p-12 pt-8">{content}</div>
		</div>
	);
};

export default Layout;
