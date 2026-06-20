import React, { useState } from "react";
import { navConfig } from "./nav.config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MultiActivityForm } from "@/components/activities/multi-activity-form";

const MainNav = () => {
	const pathname = usePathname();
	const [quickAddOpen, setQuickAddOpen] = useState(false);

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
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setQuickAddOpen(true)}
					className="ml-2"
				>
					<Plus className="mr-1 h-4 w-4" />
					Add Activity
				</Button>
			</nav>

			<MultiActivityForm
				date={new Date()}
				open={quickAddOpen}
				onOpenChange={setQuickAddOpen}
			/>
		</div>
	);
};

export default MainNav;
