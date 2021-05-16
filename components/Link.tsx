import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import styled from "styled-components";

interface Props {
	href: string;
	children: React.ReactNode;
}

const StyledLink = styled(NextLink)`
	color: red;
	a {
		color: red;
	}
`;

const ActiveLink = ({ href, children }: Props) => {
	const router = useRouter();

	console.log(href);

	let active = false;
	if (router.pathname.replace(/^\//g, "") === href.replace(/^\//g, "")) {
		active = true;
	}

	console.log(active);
	return <StyledLink href={href}>{children}</StyledLink>;
};

export default ActiveLink;
