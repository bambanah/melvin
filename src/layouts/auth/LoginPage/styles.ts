import { lighten, shade } from "polished";
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
	gap: 1rem;
	min-width: 20rem;

	padding: 3rem;
	background-color: ${({ theme }) =>
		theme.type === "light"
			? shade(0.2, theme.colors.bg)
			: lighten(0.1, theme.colors.bg)};

	border-radius: 20px;

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
	gap: 1.5rem;

	width: 100%;
	margin: 1.1rem 0px;

	color: ${({ theme }) => shade(0.2, theme.colors.fg)};

	&::before,
	&::after {
		flex-grow: 1;
		display: inline-block;

		content: "";

		border-top: 0.1rem solid ${({ theme }) => shade(0.2, theme.colors.fg)};
	}
`;
