import { ButtonVariant } from "@atoms/button";
import classNames from "classnames";
import Link, { LinkProps } from "next/link";
import React, { ReactNode } from "react";

const Header = ({ children }: { children: ReactNode | ReactNode[] }) => (
	<div className="flex items-center justify-between gap-2 px-4 py-2">
		{children}
	</div>
);

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
	children: React.ReactNode;
	className?: string;
}
const PageComponent = ({ children, className }: PageComponentProps) => {
	return (
		<div
			className={classNames([
				"mx-auto flex h-full w-full max-w-4xl flex-col pb-16",
				className,
			])}
		>
			{children}
		</div>
	);
};

const ListPage = Object.assign(PageComponent, { Items, Item, Header });

export default ListPage;
