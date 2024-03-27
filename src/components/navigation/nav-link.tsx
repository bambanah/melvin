import { cn } from "@/lib/utils";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import NextLink from "next/link";
import { useRouter } from "next/router";

interface Props {
	href: string;
	icon?: IconDefinition;
	children: React.ReactNode;
	className?: string;
}

const Link = ({ href, icon, children, className }: Props) => {
	const active = useRouter().pathname.split("/")[2] === href.split("/")[2];

	return (
		<NextLink
			href={href}
			className={cn([
				active ? "text-orange-700" : "text-foreground",
				"flex flex-col gap-1 whitespace-nowrap p-2 text-xs hover:text-orange-700 md:text-base",
				className,
			])}
		>
			{icon && (
				<span className="text-center md:hidden">
					<FontAwesomeIcon icon={icon} size="lg" />
				</span>
			)}
			{children}
		</NextLink>
	);
};

export default Link;
