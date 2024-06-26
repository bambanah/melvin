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
				<span className="-mt-1 font-display text-2xl text-[#ff8484]">
					melvin
				</span>
				{navConfig.map(({ href, title }) => (
					<Link
						key={title}
						href={href}
						className={cn(
							"transition-colors",
							pathname?.startsWith(href)
								? "font-semibold text-foreground hover:text-foreground"
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
