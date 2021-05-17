import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import styled from "styled-components";

interface Props {
	href: string;
	children: React.ReactNode;
}

interface StyleProps {
	active: boolean;
}

const StyledLink = styled.a<StyleProps>`
	text-decoration: none;
	color: ${({ theme }) => theme.colors.fg};
	margin: 0 0.7rem;
	font-weight: bold;
	padding: 0 0.2rem;
	border-bottom: 2px solid transparent;

	background: ${(props) =>
		props.active
			? "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)"
			: "none"};
	-webkit-text-fill-color: ${(props) =>
		props.active ? "transparent" : "none"};
	background-clip: text;

	&:hover {
		border-bottom-color: black;
	}
`;

const Link = ({ href, children }: Props) => {
	const router = useRouter();

	return (
		<NextLink href={href}>
			<StyledLink active={router.pathname === href}>{children}</StyledLink>
		</NextLink>
	);
};

export default Link;
