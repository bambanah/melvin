import { shade } from "polished";
import styled from "styled-components";

export const Container = styled.div`
	width: 100%;
	max-width: 40em;
	align-self: center;
	padding: 3em 0;

	form {
		gap: 4rem;
	}

	h1 {
		margin-bottom: 3rem;
		text-align: center;
	}

	.highlightable {
		transition: all 0.2s ease;

		&.highlighted {
			padding: 2em;
			background-color: ${({ theme }) => theme.colors.link}1e;
		}
	}
`;

export const ClientSelect = styled.div`
	background-color: ${({ theme }) => theme.colors.bg};
`;

export const ClientDetails = styled.div`
	display: flex;
	gap: 1em;
	padding: 0em;
	background-color: ${({ theme }) => theme.colors.bg};

	label {
		flex: 1 1 50%;
	}
`;

export const ConfirmClientDetails = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1em;

	h2,
	p {
		margin: 0;
	}
`;

export const ActivityContainer = styled.div`
	display: flex;
	flex-direction: column;
`;

export const Activity = styled.div`
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
	gap: 1em;

	padding-bottom: 3em;

	&:not(:first-of-type) {
		border-top: 2px dotted ${({ theme }) => theme.colors.fg}dd;
		padding-top: 3em;
	}

	.react-select {
		flex-basis: 100%;
		font-weight: bold;
	}
`;

export const ActivityRow = styled.div`
	display: flex;
	flex-direction: row;
	gap: 1em;
	justify-content: center;
	align-items: flex-end;

	h3 {
		margin: 0;
		color: ${({ theme }) => shade(0.05, theme.colors.brand)};
	}

	.delete-button {
		flex: 0 1 auto;
		align-items: flex-end;
		button {
			width: 2.5em;
			height: 2.5em;
			padding: 0;
		}
	}
`;

export const Debug = styled.div`
	margin-top: 5em;

	& > span {
		margin-top: 1rem;
	}
`;
