import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import { ReactNode } from "react";

const Header = ({ children }: { children: ReactNode | ReactNode[] }) => (
	<div className="flex items-center justify-between gap-2 px-4 py-2">
		{children}
	</div>
);

const Item = ({
	children,
	className,
	...rest
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
	LinkProps) => (
	<Link
		className={cn([
			"flex w-full justify-between gap-2 p-4 text-sm text-neutral-900 transition-colors duration-75 hover:bg-orange-100",
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
			className={cn([
				"mx-auto flex h-full w-full max-w-4xl flex-col pb-16",
				className,
			])}
		>
			{children}
		</div>
	);
};

const ListPage = Object.assign(PageComponent, { Item, Header });

export default ListPage;
