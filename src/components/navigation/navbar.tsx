import NavAuth from "@/components/auth/nav-auth";
import NavLink from "@/components/navigation/nav-link";
import { ModeToggle } from "@/components/theme-toggle";
import {
	faFile,
	faRunning,
	faShoePrints,
	faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "next-auth/react";

const Navbar = () => {
	const session = useSession();

	return (
		<div className="shadow-top fixed bottom-0 flex h-14 w-full items-center gap-8 border-b border-t bg-inherit md:relative md:h-16 md:px-10">
			<div className="mx-auto flex w-full max-w-5xl items-center justify-between">
				<div className="flex w-full items-center justify-evenly md:mx-auto md:flex-row md:content-end md:justify-start md:gap-3 md:p-0">
					<NavLink href="/dashboard/invoices" icon={faFile} className="order-1">
						Invoices
					</NavLink>
					<NavLink href="/dashboard/clients" icon={faUsers} className="order-2">
						Clients
					</NavLink>
					<NavLink
						href="/dashboard/activities"
						icon={faRunning}
						className="order-4"
					>
						Activities
					</NavLink>
					<NavLink
						href="/dashboard/support-items"
						icon={faShoePrints}
						className="order-5"
					>
						Items
					</NavLink>
				</div>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<NavAuth user={session.data?.user} />
				</div>
			</div>
		</div>
	);
};

export default Navbar;
