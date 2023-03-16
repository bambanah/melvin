import Display from "@atoms/display";
import NavAuth from "@components/auth/nav-auth";
import NavLink from "@components/navigation/nav-link";
import {
	faFile,
	faHome,
	faRunning,
	faShoePrints,
	faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "next-auth/react";
import Link from "next/link";

const Navbar = () => {
	const session = useSession();

	return (
		<div className="fixed bottom-0 flex h-14 w-full items-center gap-8 border-t bg-zinc-50 shadow-top md:relative md:mx-auto md:h-20 md:max-w-7xl md:px-10">
			<Link href="/invoices" className="hidden md:inline-block">
				<Display className="xsmall brand">melvin</Display>
			</Link>
			<div className="flex w-full items-center justify-evenly md:mt-2 md:flex-row md:content-end md:items-end md:justify-start md:gap-3 md:p-0">
				<NavLink href="/" icon={faHome}>
					Home
				</NavLink>
				<NavLink href="/clients" icon={faUsers}>
					Clients
				</NavLink>
				<NavLink href="/invoices" icon={faFile}>
					Invoices
				</NavLink>
				<NavLink href="/activities" icon={faRunning}>
					Activities
				</NavLink>
				<NavLink href="/support-items" icon={faShoePrints}>
					Items
				</NavLink>
			</div>

			<NavAuth user={session.data?.user} />
		</div>
	);
};

export default Navbar;
