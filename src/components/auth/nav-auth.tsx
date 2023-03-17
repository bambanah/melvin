import {
	faCaretDown,
	faExternalLink,
	faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, Transition } from "@headlessui/react";
import classNames from "classnames";
import { signOut } from "next-auth/react";
import Link from "next/link";
import React from "react";

interface NavAuthProps {
	user?: { id: string; email: string };
}

const NavAuth = ({ user }: NavAuthProps) => {
	const sharedItemClass =
		"flex w-full items-center p-2 btn-base text-slate-900 bg-slate-50";
	const activeItemClass = "btn-raised";

	return (
		<Menu as="div" className="relative z-50 hidden text-left md:inline-block">
			<div>
				<Menu.Button>
					<div className="whitespace-nowrap p-3 text-gray-700 hover:text-fg">
						<FontAwesomeIcon icon={faUserCircle} size="xl" title="Account" />{" "}
						<FontAwesomeIcon icon={faCaretDown} size="xs" />
					</div>
				</Menu.Button>
			</div>
			<Transition
				as={React.Fragment}
				enter="transition ease-out duration-100"
				enterFrom="transform opacity-0 scale-95"
				enterTo="transform opacity-100 scale-100"
				leave="transition ease-in duration-75"
				leaveFrom="transform opacity-100 scale-100"
				leaveTo="transform opacity-0 scale-95"
			>
				<Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-300 bg-slate-50 p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
					<div className="flex flex-col">
						<Menu.Item>
							<Link
								href="/account"
								className="w-full overflow-clip text-ellipsis p-2 text-gray-900"
							>
								<p className="text-sm">Signed in as</p>
								{user && <span className="font-semibold">{user.email}</span>}
							</Link>
						</Menu.Item>
					</div>
					<div className="flex flex-col gap-2 py-4">
						<Menu.Item>
							{({ active }) => (
								<Link
									href="/account/edit"
									className={classNames([
										sharedItemClass,
										active && activeItemClass,
									])}
								>
									Manage Account
								</Link>
							)}
						</Menu.Item>
						<Menu.Item>
							{({ active }) => (
								<a
									href="/price-guide-3-21.pdf"
									target="_blank"
									className={classNames([
										sharedItemClass,
										active && activeItemClass,
										"gap-1",
									])}
								>
									Price Guide
									<FontAwesomeIcon icon={faExternalLink} size="xs" />
								</a>
							)}
						</Menu.Item>
					</div>
					<div className="flex flex-col gap-1 pt-4">
						<Menu.Item>
							{({ active }) => (
								<button
									onClick={() => {
										signOut();
									}}
									className={classNames([
										sharedItemClass,
										active && activeItemClass,
									])}
								>
									Log Out
								</button>
							)}
						</Menu.Item>
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	);
};

export default NavAuth;
