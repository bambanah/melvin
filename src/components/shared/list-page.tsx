import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link, { LinkProps } from "next/link";
import React from "react";

type HeaderProps = {
	title?: string;
	createNewHref?: string;
	variant?: "default" | "skeleton";
	extraButtons?: React.ReactNode;
};

const Header = ({
	title,
	createNewHref,
	extraButtons,
	variant = "default",
}: HeaderProps) => (
	<div className="flex items-center justify-between gap-2 px-4 py-2">
		{title && <h2 className="mr-auto text-2xl font-bold">{title}</h2>}
		{createNewHref && (
			<>
				{extraButtons}
				<Button asChild variant="inverted">
					<Link href={createNewHref}>
						<Plus className="h-4 w-4" />
						Add
					</Link>
				</Button>
			</>
		)}

		{variant === "skeleton" && (
			<>
				<h2 className="mr-auto w-32 text-3xl font-bold">
					<Skeleton />
				</h2>

				<div className="box-content h-6 w-24 border border-transparent py-2 text-4xl">
					<Skeleton />
				</div>
			</>
		)}
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
				"mx-auto flex w-full max-w-4xl flex-col gap-4",
				className,
			])}
		>
			{children}
		</div>
	);
};

const ListPage = Object.assign(PageComponent, { Item, Header });

export default ListPage;
