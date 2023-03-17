import Heading from "@atoms/heading";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React, { ReactNode } from "react";

const Items = ({ children }: { children: ReactNode }) => {
	return <div className="flex flex-col divide-y">{children}</div>;
};

const Item = ({ children, href }: { children: ReactNode; href: string }) => (
	<Link
		href={href}
		className="flex w-full justify-between gap-4 p-4 text-sm text-zinc-900 hover:bg-zinc-100"
	>
		{children}
	</Link>
);

interface PageComponentProps {
	title: string;
	createHref?: string;
	filterComponent?: React.ReactNode;
	children: React.ReactNode;
}
const PageComponent = ({ title, createHref, children }: PageComponentProps) => {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col pb-32">
			<div className="flex items-center justify-between  px-4 py-2 ">
				<Heading>{title}</Heading>

				{createHref && (
					<Link
						href={createHref}
						className="fixed bottom-32 right-6 flex h-12 w-12 items-center justify-center rounded-md bg-indigo-700 text-2xl leading-none text-zinc-50 md:relative md:inset-0 md:h-10 md:w-28 md:gap-2 md:text-base hover:md:bg-indigo-600"
					>
						<FontAwesomeIcon icon={faPlus} />{" "}
						<span className="hidden md:inline"> Add New</span>
					</Link>
				)}
			</div>

			{children}
		</div>
	);
};

const ListPage = Object.assign(PageComponent, { Items, Item });

export default ListPage;
