import classNames from "classnames";
import NextLink from "next/link";
import { useRouter } from "next/router";
import React from "react";

interface Props {
	href: string;
	children: React.ReactNode;
}

const Link = ({ href, children }: Props) => {
	const active = useRouter().pathname.split("/")[1] === href.split("/")[1];

	return (
		<NextLink
			href={href}
			className={classNames([
				active ? "text-brand" : "text-fg",
				"whitespace-nowrap p-2 font-semibold hover:text-brand",
			])}
		>
			{children}
		</NextLink>
	);
};

export default Link;
