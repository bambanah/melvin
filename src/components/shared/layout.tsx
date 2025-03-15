import Navbar from "@/components/navigation/navbar";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import SkeletonLayout from "./skeleton-layout";

interface Props {
	children: React.ReactNode;
	isLoading?: boolean;
	className?: string;
}

const Layout = ({ children, isLoading, className }: Props) => {
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

			<div
				className={cn("flex flex-auto flex-col px-2 py-8 sm:px-12", className)}
			>
				{content}
			</div>
		</div>
	);
};

export default Layout;
