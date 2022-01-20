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
	width: 11em;
	text-decoration: none;
	color: ${({ active, theme }) =>
		active ? theme.colors.bg : `${theme.colors.fg}88`};
	font-weight: 700;
	border: 2px solid transparent;

	background: ${({ active, theme }) =>
		active ? theme.colors.fg : theme.colors.bg};
	padding: 0.7em 1.2em;
	border-radius: 0.3rem;

	transition: color 0.1s, border-color 0.1s, background-color 0.1s;

	svg {
		margin-right: 0.5rem;
	}

	&:hover {
		color: ${({ active, theme }) =>
			active ? theme.colors.bg : theme.colors.fg};
		border-color: ${({ active, theme }) =>
			active ? theme.colors.fg : theme.colors.fg};
	}
`;

const Link = ({ href, children }: Props) => {
	const router = useRouter();

	return (
		<NextLink href={href}>
			<StyledLink active={`/${router.pathname.split("/")[1]}` === href}>
				{children}
			</StyledLink>
		</NextLink>
	);
};

export default Link;
