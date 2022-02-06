import styled from "styled-components";

export const Container = styled.div`
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;

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

export const SupportItemList = styled.div`
	width: 100%;
	max-width: 60em;
	display: flex;
	flex-direction: column;
	flex: 1;

	padding-top: 6em;
`;

export const SupportItem = styled.div`
	display: flex;
	flex: 0 0 auto;
	align-items: center;

	cursor: pointer;

	&:hover {
		color: ${({ theme }) => theme.colors.brand};

		h1 {
			color: ${({ theme }) => theme.colors.brand};
		}
	}

	h1 {
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		flex: 1;
	}

	.code {
		flex: 0 0 7em;
		text-align: right;
	}

	.rate {
		flex: 0 0 6em;
		text-align: right;
	}
`;
