import styled from "styled-components";

export const Separator = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: nowrap;
	gap: 1.1rem;
	font-size: 0.8rem;

	width: 100%;
	margin: 1.1rem 0px;

	color: ${({ theme }) => theme.colors.fg};

	&::before,
	&::after {
		flex-grow: 1;
		display: inline-block;

		content: "";

		border-top: 0.1rem solid ${({ theme }) => theme.colors.fg}88;
	}
`;
