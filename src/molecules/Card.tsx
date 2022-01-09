import { lighten } from "polished";
import styled from "styled-components";

const Card = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	width: 23rem;
	height: 13rem;
	gap: 0.8rem;
	cursor: pointer;
	padding: 2rem 4rem;

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
			font-size: 5rem;
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
		font-size: 1.7rem;
		transition: color 0.15s ease;
	}

	p {
		color: ${({ theme }) => theme.colors.fg}99;
	}
`;

export default Card;
