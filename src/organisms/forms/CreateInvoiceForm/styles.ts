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
			border-radius: 1em;
			padding: 2em;
			background-color: ${({ theme }) => theme.colors.link}1e;
		}
	}
`;

export const ClientSelect = styled.div`
	background-color: ${({ theme }) => theme.colors.bg};
`;

export const ActivityContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2em;
`;

export const Activity = styled.div`
	display: flex;
	border-bottom: 1px solid black;
	padding: 1em 0;
`;

export const ClientDetails = styled.div`
	display: flex;
	gap: 1em;
	padding: 0em;
	border-radius: 0.5em;
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

export const Debug = styled.div`
	margin-top: 35em;
`;
