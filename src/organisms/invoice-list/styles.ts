import styled from "styled-components";

export const Container = styled.div`
	align-self: center;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 3rem;
	padding: 3em 0;
`;

export const Header = styled.div`
	min-width: 30em;
	width: 60%;
	display: flex;
	justify-content: space-between;

	h1 {
		font-family: "Patua One";
		margin: 0;
	}
`;

export const CreateNew = styled.a`
	padding: 0.8em;
	border-radius: 0.8em;
	background: ${({ theme }) => theme.colors.bg};
	color: ${({ theme }) => theme.colors.fg};
	box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.5);

	&:hover {
		color: ${({ theme }) => theme.colors.fg};
	}
`;

export const InvoiceContainer = styled.div`
	min-width: 30em;
	width: 100%;
	transition: all 0.25s ease;
	box-shadow: 0px 4px 12px
		rgba(0, 0, 0, ${({ theme }) => (theme.type === "dark" ? "0.85" : "0.15")});
	border-radius: 1.3rem;

	.fa-chevron-right {
		transition: transform 0.2s ease;
	}

	&.expanded {
		width: 100%;
		& > div:first-of-type {
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
		}
		& > div:last-of-type {
			height: 50vw;
			max-height: 40em;
		}

		.fa-chevron-right {
			transform: rotate(90deg);
		}
	}
`;

export const Invoice = styled.div`
	flex: 1 0 auto;
	display: flex;
	justify-content: space-between;
	cursor: pointer;
	border-radius: 1.3rem;

	background: ${({ theme }) => theme.colors.bg};
	color: ${({ theme }) => theme.colors.fg};

	transition: all 0.15s ease;

	div {
		transition: all 0.15s ease;
	}

	& > div:first-of-type {
		flex: 1 0 auto;
		display: flex;
		justify-content: space-between;
		padding: 2em 3em;

		h2 {
			color: ${({ theme }) => theme.colors.brand};
		}

		&:hover {
			color: ${({ theme }) => theme.colors.brand};
		}
	}
`;

// Expander? Hardly know her
export const Expander = styled.div`
	flex-basis: 10%;
	display: flex;
	align-items: center;
	justify-content: flex-start;
`;

export const Column = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 1em;
	flex: 1;

	&:nth-of-type(3) {
		align-items: flex-end;
	}

	h2 {
		margin: 0;
	}
`;

export const Actions = styled.div`
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: center;
	flex-basis: 8%;

	a {
		padding: 0.8em;
		color: ${({ theme }) => theme.colors.fg}99;

		&:hover {
			color: ${({ theme }) => theme.colors.brand};
		}
	}

	& > div {
		padding: 0.8em;
		transition: color 0.1s ease;
		color: ${({ theme }) => theme.colors.fg}99;

		&:hover {
			color: ${({ theme }) => theme.colors.brand};
		}
	}
`;

export const OptionsMenu = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;

	.dropdown {
		position: absolute;
		display: flex;
		flex-direction: column;
		opacity: 0;
		transform: scaleY(0) translateY(4.8em);
		right: 0;

		background-color: white;
		box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
		border-radius: 0.4em;
		overflow: hidden;

		z-index: 1000;

		a {
			width: 7em;
			padding: 0.6em 1em;
			color: ${({ theme }) => theme.colors.fg};
			background-color: ${({ theme }) => theme.colors.bg};

			transition: all 0.1s ease;

			&:hover {
				color: ${({ theme }) => theme.colors.bg};
				background-color: ${({ theme }) => theme.colors.fg};
			}
		}
	}

	&:focus-within {
		.dropdown {
			opacity: 1;
			transform: scaleY(1) translateY(4.8em);
		}
	}
`;

export const PdfPreview = styled.div`
	height: 0;
	max-height: 0;
	width: 100%;

	overflow-y: scroll;
	overflow-x: hidden;

	transition: all 0.25s ease 0s;
`;
