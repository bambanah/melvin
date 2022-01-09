import { lighten } from "polished";
import styled from "styled-components";

const Card = styled.div`
	display: flex;
	flex-direction: column;
	width: 23rem;
	gap: 0.8rem;
	cursor: pointer;
	padding: 2rem 5rem;

	box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.8);

	border-radius: 1rem;
	transition: box-shadow 0.15s ease;
	transition: transform 0.15s ease;

	&.create {
		justify-content: center;
		align-items: center;

		background-color: ${({ theme }) => lighten(0.05, theme.colors.brand)};

		color: ${({ theme }) =>
			theme.type === "dark" ? theme.colors.bg : theme.colors.fg};

		span {
			font-size: 5rem;
		}
	}

	&:hover {
		transform: scale(1.02);
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
		font-size: 1.5rem;
		transition: color 0.15s ease;
	}

	p {
		color: ${({ theme }) => theme.colors.fg}99;
	}
`;

export default Card;
