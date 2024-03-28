import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { navConfig } from "./nav.config";

const MobileNav = () => {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
				>
					<svg viewBox="0 0 13 13" fill="currentColor" className="h-5 w-5">
						<g id="SVGRepo_iconCarrier">
							<g>
								<rect x="0" y="0" width="283.426" height="2"></rect>
								<rect x="0" y="5" width="283.426" height="2"></rect>
								<rect x="0" y="10" width="283.426" height="2"></rect>
							</g>
						</g>
					</svg>
					<span className="sr-only">Toggle Menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="pr-0">
				<MobileLink
					href="/dashboard/invoices"
					className="flex items-center"
					onOpenChange={setOpen}
				>
					<span className="-mt-1 font-display text-3xl font-normal text-[#ff8484]">
						melvin
					</span>
				</MobileLink>
				<div className="my-4 flex h-[calc(100vh-8rem)] flex-col pb-10">
					{navConfig.map(
						(item) =>
							item.href && (
								<MobileLink
									key={item.href}
									href={item.href}
									onOpenChange={setOpen}
								>
									{item.title}
								</MobileLink>
							)
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
};

interface MobileLinkProps extends LinkProps {
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
	className?: string;
}

function MobileLink({
	href,
	onOpenChange,
	className,
	children,
	...props
}: MobileLinkProps) {
	const router = useRouter();

	return (
		<Link
			href={href}
			onClick={() => {
				router.push(href.toString());
				onOpenChange?.(false);
			}}
			className={cn(className, "py-4 pl-4 font-semibold")}
			{...props}
		>
			{children}
		</Link>
	);
}

export default MobileNav;
