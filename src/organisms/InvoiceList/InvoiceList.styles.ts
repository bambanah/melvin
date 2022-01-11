import styled from "styled-components";

export const Container = styled.div`
	align-self: center;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2rem;
	padding: 3em 0;
`;

export const InvoiceContainer = styled.div`
	min-width: 30em;
	width: 60%;
	transition: all 0.25s ease 0.3s;
	box-shadow: 2px 2px 12px rgba(0, 0, 0, 0.8);
	border-radius: 0.8rem;
	overflow: hidden;

	.fa-chevron-right {
		transition: transform 0.2s ease;
	}

	&.expanded {
		width: 100%;

		transition-delay: 0s;

		& > div:first-of-type {
			&:hover {
				transform: none;
			}
		}

		& > div:last-of-type {
			height: 50vw;
			max-height: 40em;
			transition-delay: 0.35s;
		}

		.fa-chevron-right {
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
	height: 0;
	min-height: 0;
	width: 100%;

	overflow: hidden;

	transition: all 0.25s ease 0s;
`;
