import styled from "styled-components";

export const Container = styled.div`
	align-self: center;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2rem;
`;

export const InvoiceContainer = styled.div`
	min-width: 30em;
	width: 60%;
	transition: all 0.35s ease;
	box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.8);
	border-radius: 0.8rem;
	overflow: hidden;

	svg {
		transition: transform 0.2s ease;
	}

	&.expanded {
		width: 100%;

		& > div:first-of-type {
			&:hover {
				transform: none;
			}
		}

		& > div:last-of-type {
			min-height: 30em;
		}

		svg {
			transform: rotate(90deg);
		}
	}
`;

export const Invoice = styled.div`
	flex: 1 0 auto;
	display: flex;
	padding: 2em 3em;
	gap: 1rem;
	justify-content: space-between;

	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		transform: scale(1.02);

		color: ${({ theme }) => theme.colors.brand};
	}
`;

// Expander? Hardly know her
export const Expander = styled.div`
	flex-basis: 4%;
	display: flex;
	align-items: center;
`;

export const Column = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 1em;
	flex-basis: 48%;

	&:last-of-type {
		align-items: flex-end;
	}

	h2 {
		margin: 0;
	}
`;

export const PdfPreview = styled.div`
	background-color: ${({ theme }) => theme.colors.fg};
	color: ${({ theme }) => theme.colors.bg};
	height: 0;
	min-height: 0;
	width: 100%;
	z-index: 1000;

	overflow: hidden;

	transition: all 0.35s ease;
`;
