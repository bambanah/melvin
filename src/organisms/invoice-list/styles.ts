import styled from "styled-components";

export const Container = styled.div`
	align-self: center;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 3rem;
	height: 100%;

	width: 100%;
`;

export const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;

	margin: auto;
	width: 100%;
	max-width: 60em;
`;

export const PdfPreview = styled.div`
	height: 0;
	flex: 1 0 100%;

	overflow-y: auto;
	overflow-x: hidden;

	transition: all 0.25s;
`;

export const InvoiceContainer = styled.div`
	flex: 1 0 auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1em;
	padding-bottom: 5em;
`;

export const Invoice = styled.div`
	flex: 0 0 auto;
	max-width: 60em;
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: stretch;

	color: ${({ theme }) => theme.colors.fg};
	border-radius: var(--radius-medium);
	overflow: hidden;
	transition: box-shadow 0.2s;

	&.expanded {
		box-shadow: var(--shadow-medium);

		> div:first-of-type {
			svg {
				transform: rotate(90deg);
			}
		}

		> div:nth-of-type(2) {
			height: 4em;
			opacity: 1;
			overflow: visible;
		}

		> div:last-of-type {
			height: 30em;
		}
	}
`;

export const InvoiceDetails = styled.div`
	flex: 1 0 auto;
	display: flex;
	justify-content: space-between;
	align-items: center;

	padding: 1.4em 1.2em;
	cursor: pointer;

	gap: 2rem;
	transition: background 0.1s;

	&:hover {
		color: ${({ theme }) => theme.colors.brand};
	}

	svg {
		transition: transform 0.2s;
	}

	h2 {
		margin: 0;
		flex: 0 0 4em;
	}

	.date {
		flex: 0 0 3em;
		text-align: left;
	}

	.name {
		flex: 1 0 auto;
	}

	.status {
		flex: 0 0 6em;

		&.unsent svg {
			color: #ff8585;
		}

		&.sent svg {
			color: #feda22;
		}

		&.complete svg {
			color: #88c656;
		}
	}

	.total {
		flex: 0 0 4em;
		text-align: right;
		font-weight: 500;
	}
`;

export const Actions = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1 0 100%;
	overflow: hidden;
	gap: 2em;

	height: 0;
	opacity: 0;

	transition: opacity 0.1s, height 0.1s;

	a {
		padding: 0.3em 0.8em;
		color: ${({ theme }) => theme.colors.fg}99;
		background-color: ${({ theme }) => theme.colors.bg};
		border-radius: 0.3em;
		box-shadow: 0px 0px 16px rgba(0, 0, 0, 0.12);

		svg {
			margin-right: 0.3em;
		}

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
