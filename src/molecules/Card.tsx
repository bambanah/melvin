import Link from "next/link";
import { lighten } from "polished";
import { FC } from "react";
import styled from "styled-components";

const StyledCard = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	width: 23em;
	height: 13em;
	gap: 0.8rem;
	cursor: pointer;
	padding: 2em 4em;

	background-color: ${({ theme }) =>
		theme.type === "dark" ? lighten(0.05, theme.colors.bg) : theme.colors.bg};
	box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.8);

	border-radius: 1rem;
	transition: box-shadow 0.15s ease;
	transition: transform 0.15s ease;

	&.create {
		justify-content: center;
		align-items: center;

		color: ${({ theme }) =>
			theme.type === "dark" ? theme.colors.bg : theme.colors.fg};
		background-color: ${({ theme }) => lighten(0.05, theme.colors.brand)};

		span {
			font-size: 5em;
		}
	}

	&:hover {
		transform: scale(1.05);
		box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.8);

		h1 {
			color: ${({ theme }) => theme.colors.brand};
		}
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		font-size: 1.7em;
		transition: color 0.15s ease;
	}

	p {
		color: ${({ theme }) => theme.colors.fg}99;
	}
`;

interface CardProps {
	href?: string;
	create?: boolean;
}

const Card: FC<CardProps> = ({ href, children, create }) => {
	if (href) {
		return (
			<Link href={href}>
				<a>
					<StyledCard className={create ? "create" : ""}>{children}</StyledCard>
				</a>
			</Link>
		);
	}

	return <StyledCard className={create ? "create" : ""}>{children}</StyledCard>;
};

export default Card;
