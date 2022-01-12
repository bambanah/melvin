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
	font-family: "Inter";
	text-decoration: none;
	color: ${({ active, theme }) =>
		active ? theme.colors.brand : theme.colors.fg};
	margin: 0 0.7rem;
	font-weight: ${({ active }) => (active ? "bold" : "500")};
	padding: 0 0.2rem;
	border-bottom: 2px solid transparent;

	&:hover {
		color: ${({ active, theme }) =>
			active ? theme.colors.brand : theme.colors.fg};
		border-bottom-color: ${(props) => props.theme.colors.brand};
	}
`;

const Link = ({ href, children }: Props) => {
	const router = useRouter();

	return (
		<NextLink href={href}>
			<StyledLink
				active={"/" + router.pathname.split("/")[1] === href}
				data-cy="nav-item"
			>
				{children}
			</StyledLink>
		</NextLink>
	);
};

export default Link;
