import Logo from "@atoms/logo";
import NavAuth from "@components/auth/nav-auth";
import NavLink from "@components/navigation/nav-link";
import {
	faFile,
	faPenToSquare,
	faRunning,
	faShoePrints,
	faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";

const Navbar = () => {
	const session = useSession();

	return (
		<div className="fixed bottom-0 flex h-14 w-full items-center gap-8 border-t bg-bg shadow-top md:relative md:mx-auto md:h-20 md:max-w-7xl md:px-10 md:shadow-none">
			<Link href="/invoices" className="hidden md:inline-block">
				<Logo>melvin</Logo>
			</Link>
			<div className="flex w-full items-center justify-evenly md:mt-2 md:flex-row md:content-end md:justify-start md:gap-3 md:p-0">
				<NavLink href="/clients" icon={faUsers} className="order-1">
					Clients
				</NavLink>
				<NavLink href="/invoices" icon={faFile} className="order-2">
					Invoices
				</NavLink>
				<NavLink href="/activities" icon={faRunning} className="order-4">
					Activities
				</NavLink>
				<NavLink href="/support-items" icon={faShoePrints} className="order-5">
					Items
				</NavLink>
				<Link
					href="/activities/create"
					className="order-3 mb-2 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-gray-900 text-2xl text-gray-50 shadow-lg hover:bg-gray-800 md:order-6 md:ml-auto md:h-auto md:w-auto md:rounded-md md:px-3 md:py-1.5 md:text-sm md:hover:text-gray-50"
				>
					<FontAwesomeIcon icon={faPenToSquare} />
					<span className="hidden md:inline">LOG</span>
				</Link>
			</div>

			<NavAuth user={session.data?.user} />
		</div>
	);
};

export default Navbar;
