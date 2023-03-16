import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import NextLink from "next/link";
import { useRouter } from "next/router";
import React from "react";

interface Props {
	href: string;
	icon?: IconDefinition;
	children: React.ReactNode;
}

const Link = ({ href, icon, children }: Props) => {
	const active = useRouter().pathname.split("/")[1] === href.split("/")[1];

	return (
		<NextLink
			href={href}
			className={classNames([
				active ? "text-indigo-700" : "text-neutral-600",
				"flex flex-col gap-1 whitespace-nowrap p-2 text-xs hover:text-brand md:text-base md:font-semibold",
			])}
		>
			{icon && <FontAwesomeIcon icon={icon} size="lg" className="md:hidden" />}
			{children}
		</NextLink>
	);
};

export default Link;
