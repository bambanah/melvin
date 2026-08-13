import { QuickAddFab } from "@/components/activities/quick-add-fab";
import { OpenSessionBanner } from "@/components/log/open-session-banner";
import Navbar from "@/components/navigation/navbar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import SkeletonLayout from "./skeleton-layout";

interface Props {
	children: React.ReactNode;
	isLoading?: boolean;
	className?: string;
}

const Layout = ({ children, isLoading, className }: Props) => {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	let content: ReactNode;

	// isPending is checked first: better-auth reports "no session yet" as an
	// absent `data` while it resolves, so redirecting on !session alone would
	// bounce authenticated users out on every load.
	if (isPending || isLoading) {
		content = <SkeletonLayout />;
	} else if (!session) {
		content = <p>Redirecting...</p>;
		router.push("/");
	} else {
		content = children;
	}

	return (
		<div className="flex h-full min-h-screen w-full flex-col">
			<Navbar />
			{session && <OpenSessionBanner />}

			<div
				className={cn("flex flex-auto flex-col px-2 py-8 sm:px-12", className)}
			>
				{content}
			</div>

			{/* The Log tab has its own capture affordances - the Activities FAB
			    would overlap the console's bottom actions on a phone. */}
			{session && router.pathname !== "/dashboard/log" && <QuickAddFab />}
		</div>
	);
};

export default Layout;
