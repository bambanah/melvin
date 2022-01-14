import { lighten } from "polished";
import styled from "styled-components";

export const Container = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;

	min-height: 100vh;
`;

export const Modal = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: stretch;
	align-items: center;
	gap: 1.9rem;
	min-width: 26rem;

	padding: 3rem;
	background-color: ${({ theme }) =>
		theme.type === "dark" ? lighten(0.1, theme.colors.bg) : "#fff"};

	border-radius: 5px;
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);

	span {
		cursor: auto;
	}

	button {
		width: 100%;

		svg {
			margin-right: 0.4rem;
		}
	}

	p {
		margin: 0;
	}
`;

export const Separator = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: nowrap;
	gap: 1.1rem;
	font-size: 0.8rem;

	width: 100%;
	margin: 1.1rem 0px;

	color: ${({ theme }) => theme.colors.fg};

	&::before,
	&::after {
		flex-grow: 1;
		display: inline-block;

		content: "";

		border-top: 0.1rem solid ${({ theme }) => theme.colors.fg}88;
	}
`;
