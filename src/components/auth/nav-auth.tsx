import { Button } from "@/components/ui/button";
import { faCaretDown, faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, Transition } from "@headlessui/react";
import { ExternalLink } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Fragment } from "react";

interface NavAuthProps {
	user?: { id: string; email: string };
}

const NavAuth = ({ user }: NavAuthProps) => {
	return (
		<Menu as="div" className="relative z-50 hidden text-left md:inline-block">
			<div>
				<Menu.Button>
					<div className="hover:text-fg flex items-center gap-1 whitespace-nowrap p-3 text-zinc-700">
						<FontAwesomeIcon icon={faUserCircle} size="xl" />
						<FontAwesomeIcon icon={faCaretDown} size="xs" />
					</div>
				</Menu.Button>
			</div>
			<Transition
				as={Fragment}
				enter="transition ease-out duration-100"
				enterFrom="transform opacity-0 scale-95"
				enterTo="transform opacity-100 scale-100"
				leave="transition ease-in duration-75"
				leaveFrom="transform opacity-100 scale-100"
				leaveTo="transform opacity-0 scale-95"
			>
				<Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-zinc-300 bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
					<div className="flex flex-col">
						<Menu.Item>
							<div className="w-full overflow-clip text-ellipsis p-2 text-zinc-900">
								<p className="text-sm">Signed in as</p>
								{user && <span className="font-semibold">{user.email}</span>}
							</div>
						</Menu.Item>
					</div>
					<div className="flex flex-col gap-2 py-4">
						<Menu.Item>
							<Button asChild variant="outline">
								<Link href="/dashboard/account/edit">Manage Account</Link>
							</Button>
						</Menu.Item>
						<Menu.Item>
							<Button asChild variant="outline">
								<Link href="/price-guide-22-23.pdf" target="_blank">
									Price Guide
									<ExternalLink className="ml-1 h-4 w-4" />
								</Link>
							</Button>
						</Menu.Item>
					</div>
					<div className="flex flex-col gap-1 pt-4">
						<Menu.Item>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									signOut();
								}}
							>
								Log Out
							</Button>
						</Menu.Item>
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	);
};

export default NavAuth;
