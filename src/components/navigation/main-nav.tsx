import React from "react";
import { navConfig } from "./nav.config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const MainNav = () => {
	const pathname = usePathname();

	return (
		<div className="mr-4 hidden md:flex">
			<nav className="flex items-center gap-4 lg:gap-6">
				<Link
					href="/dashboard"
					className="font-display -mt-1 text-2xl text-[#ff8484]"
				>
					melvin
				</Link>
				{navConfig.map(({ href, title }) => (
					<Link
						key={title}
						href={href}
						className={cn(
							"transition-colors",
							pathname?.startsWith(href)
								? "text-foreground hover:text-foreground font-semibold"
								: "text-foreground/75 hover:text-foreground"
						)}
					>
						{title}
					</Link>
				))}
			</nav>
		</div>
	);
};

export default MainNav;
