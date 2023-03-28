import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import Link, { LinkProps } from "next/link";
import React, { ReactNode } from "react";

const Items = ({ children }: { children: ReactNode }) => {
	return <div className="flex flex-col divide-y">{children}</div>;
};

const Item = ({
	children,
	className,
	...rest
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
	LinkProps) => (
	<Link
		className={classNames([
			"flex w-full justify-between gap-2 p-4 text-sm text-zinc-900 hover:bg-zinc-100",
			className,
		])}
		{...rest}
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
}
const PageComponent = ({
	title,
	createHref,
	children,
	className,
}: PageComponentProps) => {
	return (
		<div
			className={classNames([
				"mx-auto flex min-h-screen w-full max-w-4xl flex-col pb-16",
				className,
			])}
		>
			<div className="flex items-center justify-between py-2 px-4">
				<h2 className="text-2xl font-bold">{title}</h2>

				{createHref && (
					<Link
						href={createHref}
						className={classNames([
							"flex items-center justify-center rounded-md bg-indigo-600 leading-none text-gray-50 hover:text-gray-50 md:relative md:inset-0 md:h-10 md:w-28 md:gap-2 md:text-base hover:md:bg-indigo-700",
							"gap-2 px-2 py-3 text-sm",
						])}
					>
						<FontAwesomeIcon icon={faPlus} />
						<span>Add New</span>
					</Link>
				)}
			</div>

			{children}
		</div>
	);
};

const ListPage = Object.assign(PageComponent, { Items, Item });

export default ListPage;
