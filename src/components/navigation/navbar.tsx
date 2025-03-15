import NavAuth from "@/components/auth/nav-auth";
import { ModeToggle } from "@/components/theme-toggle";
import MainNav from "./main-nav";
import MobileNav from "./mobile-nav";

export function Navbar() {
	return (
		<header className="border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b shadow-xs backdrop-blur-sm">
			<div className="mx-auto flex h-14 max-w-5xl items-center">
				<MainNav />
				<MobileNav />

				<nav className="flex flex-1 items-center justify-end space-x-2">
					<ModeToggle />
					<NavAuth />
				</nav>
			</div>
		</header>
	);
}

export default Navbar;
