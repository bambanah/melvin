import { breakpoints } from "@styles/themes";
import styled from "styled-components";

export const Header = styled.header`
	width: 60%;
	height: 5rem;
	padding: 2rem 0;
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

		.brand {
			flex: 1 1 auto;
		}

		&.expanded {
			position: fixed;
		}
	}
`;

export const Content = styled.div`
	box-sizing: border-box;

	display: flex;
	align-items: center;
	justify-content: flex-end;

	text-align: center;

	@media ${breakpoints.tablet} {
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

export const Links = styled.div`
	display: flex;
	gap: 0.4em;
	flex: 1 0 auto;
	align-items: center;
	justify-content: flex-end;

	@media ${breakpoints.tablet} {
		width: 100%;
	}
`;

export const Right = styled.div`
	display: flex;
	gap: 1rem;

	@media ${breakpoints.desktop} {
		flex-direction: column-reverse;
		align-items: center;
	}

	@media ${breakpoints.tablet} {
		flex-direction: row;
		align-items: flex-start;
	}
`;
