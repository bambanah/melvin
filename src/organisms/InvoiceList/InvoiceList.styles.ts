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

export const InvoiceContainer = styled.div`
	min-width: 30em;
	width: 60%;
	transition: all 0.25s ease;
	box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
	border-radius: 1.3rem;
	overflow: hidden;

	.fa-chevron-right {
		transition: transform 0.2s ease;
	}

	&.expanded {
		width: 100%;

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

	background: ${({ theme }) => theme.colors.gradientPink};

	transition: all 0.15s ease;

	div {
		transition: all 0.15s ease;
	}

	& > div:first-of-type {
		flex: 1 0 auto;
		display: flex;
		justify-content: space-between;
		padding: 2em 3em;

		color: ${({ theme }) => theme.colors.bg};

		&:hover {
			color: ${({ theme }) => theme.colors.fg};
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

export const OptionsMenu = styled.div`
	padding: 2em 3em;
	flex-basis: 8%;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	color: ${({ theme }) => theme.colors.bg};

	&:hover {
		color: ${({ theme }) => theme.colors.fg};
	}
`;

export const PdfPreview = styled.div`
	height: 0;
	min-height: 0;
	width: 100%;

	overflow-y: scroll;

	transition: all 0.25s ease 0s;
`;
