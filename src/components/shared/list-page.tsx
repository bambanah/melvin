import Button from "@atoms/button";
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
			<div className="flex items-center justify-between px-4 py-2">
				<h2 className="text-2xl font-bold">{title}</h2>

				{createHref && (
					<Button as={Link} href={createHref} variant="primary">
						<FontAwesomeIcon icon={faPlus} />
						<span>Add New</span>
					</Button>
				)}
			</div>

			{children}
		</div>
	);
};

const ListPage = Object.assign(PageComponent, { Items, Item });

export default ListPage;
