import { breakpoints } from "@styles/themes";
import styled from "styled-components";

export const Header = styled.header`
	width: 100%;
	max-width: 80rem;
	height: 5rem;
	padding: 2rem 2.5rem;
	margin: auto;
	box-sizing: border-box;
	z-index: 100;
	background-color: ${({ theme }) => theme.colors.bg};

	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 2rem;

	@media ${breakpoints.desktop} {
		flex-basis: 5rem;
	}

	.nav-toggle {
		display: none;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
	}

	@media ${breakpoints.tablet} {
		flex-direction: row;
		inset: 0;
		height: 5rem;
		width: 100vw;
		padding: 0;
		margin-right: 0;
		padding: 0 2rem;
		justify-content: space-between;

		.nav-toggle {
			display: inline-block;
			flex: 0 0 2.5rem;
		}
	}
`;

export const Content = styled.div`
	box-sizing: border-box;
	width: 100%;

	display: flex;
	align-items: center;
	justify-content: flex-end;

	text-align: center;

	@media ${breakpoints.tablet} {
		flex-direction: column;
		position: absolute;
		width: 100vw;
		height: calc(100vh - 5rem);
		top: 5rem;
		left: 0;
		background-color: ${({ theme }) => theme.colors.bg};
		padding-bottom: 2rem;

		display: none;

		&.expanded {
			display: flex;
		}
	}
`;

export const Right = styled.div`
	display: flex;
	gap: 1rem;
`;
