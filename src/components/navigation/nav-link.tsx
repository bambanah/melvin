import NextLink from "next/link";
import { useRouter } from "next/router";
import React from "react";
import styled from "styled-components";

interface Props {
	href: string;
	children: React.ReactNode;
}

const StyledLink = styled.a`
	display: flex;
	align-items: center;
	justify-content: center;
	white-space: nowrap;

	width: 100%;
	text-decoration: none;
	color: ${({ theme }) => theme.colors.fg};
	font-weight: 600;

	padding: 0.4em 0.8em;

	transition: all 0.1s ease;

	&:hover,
	&.active {
		color: ${({ theme }) => theme.colors.brand};
	}
`;

const Link = ({ href, children }: Props) => {
	const router = useRouter();

	const className =
		router.pathname.split("/")[1] === href.split("/")[1] ? "active" : "";
	return (
		<NextLink href={href} legacyBehavior>
			<StyledLink className={className} role="link">
				{children}
			</StyledLink>
		</NextLink>
	);
};

export default Link;
