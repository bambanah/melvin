import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
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
	className?: string;
	collapseCreateButton?: boolean;
}
const PageComponent = ({
	title,
	createHref,
	children,
	className,
	collapseCreateButton = true,
}: PageComponentProps) => {
	return (
		<div
			className={classNames([
				"mx-auto flex min-h-screen w-full max-w-4xl flex-col pb-32",
				className,
			])}
		>
			<div className="flex items-center justify-between py-2 ">
				<h2 className="px-4 text-2xl font-bold">{title}</h2>

				{createHref && (
					<Link
						href={createHref}
						className={classNames([
							"flex items-center justify-center rounded-md bg-indigo-700 leading-none text-zinc-50 md:relative md:inset-0 md:h-10 md:w-28 md:gap-2 md:text-base hover:md:bg-indigo-600",
							collapseCreateButton
								? "fixed bottom-32 right-6 z-40 h-12 w-12 text-2xl"
								: "h-9 w-24 gap-2 text-sm",
						])}
					>
						<FontAwesomeIcon icon={faPlus} />{" "}
						<span
							className={classNames([
								collapseCreateButton && "hidden md:inline",
							])}
						>
							{" "}
							Add New
						</span>
					</Link>
				)}
			</div>

			{children}
		</div>
	);
};

const ListPage = Object.assign(PageComponent, { Items, Item });

export default ListPage;
