import { breakpoints } from "@styles/themes";
import styled from "styled-components";

export const Header = styled.header`
	flex: 0 0 15rem;
	width: 15rem;
	height: 100%;
	box-sizing: border-box;
	z-index: 100;
	background-color: ${({ theme }) => theme.colors.bg};

	@media ${breakpoints.desktop} {
		flex-basis: 6em;
	}

	.nav-toggle {
		display: none;
		position: fixed;
		top: 1rem;
		left: 1rem;
	}

	@media ${breakpoints.tablet} {
		position: fixed;
		margin-left: -15rem;
		transition: all 0.2s;
		padding-top: 2rem;

		flex-basis: 12rem;
		width: 12rem;

		&.expanded {
			margin-left: 0;
		}

		.nav-toggle {
			display: block;
		}
	}
`;

export const Content = styled.div`
	height: 100%;
	padding: 2rem 0;

	box-sizing: border-box;
	margin: auto;

	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-evenly;

	text-align: center;

	@media ${breakpoints.desktop} {
		.brand {
			font-size: 0px;

			:first-letter {
				font-size: 36px;
			}
		}
	}

	@media ${breakpoints.tablet} {
		.brand {
			font-size: 36px;
		}
	}
`;

export const Links = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1em;
	flex: 1 0 auto;
	align-items: flex-start;
	justify-content: flex-start;
	padding: 3rem 0;

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
