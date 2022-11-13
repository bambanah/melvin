import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import styled from "styled-components";
import { breakpoints } from "@styles/themes";

interface Props {
	href: string;
	children: React.ReactNode;
}

const StyledLink = styled.a`
	display: flex;
	align-items: center;

	width: 100%;
	text-decoration: none;
	color: ${({ theme }) => theme.colors.fg};
	font-weight: 600;

	padding: 0.4em 0.8em;

	font-family: "Poppins", "Inter", sans-serif;

	transition: all 0.1s ease;

	&:hover,
	&.active {
		color: ${({ theme }) => theme.colors.brand};
	}

	& svg {
		margin-right: 0.5rem;
	}

	@media ${breakpoints.desktop} {
		width: auto;
		padding: 0.5 1em;

		svg {
			margin: 0;
		}

		span {
			display: none;
		}
	}

	@media ${breakpoints.tablet} {
		width: 100%;
		padding: 0.5 1em;

		svg {
			margin-right: 0.5rem;
		}

		span {
			display: inline;
		}
	}
`;

const Link = ({ href, children }: Props) => {
	const router = useRouter();

	const className =
		router.pathname.split("/")[1] === href.split("/")[1] ? "active" : "";
	return (
		<NextLink href={href} legacyBehavior>
			<StyledLink className={className}>{children}</StyledLink>
		</NextLink>
	);
};

export default Link;
