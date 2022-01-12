import styled from "styled-components";

interface ContainerProps {
	error?: boolean;
}

export const Container = styled.div<ContainerProps>`
	display: flex;
	align-items: center;
	overflow: hidden;
	padding: 0 0.8rem;

	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};

	border: 0.01rem solid
		${({ error, theme }) => {
			if (error) {
				return theme.colors.error;
			}

			return theme.colors.fg + "88";
		}};
	border-radius: 0.3rem;

	&:focus-within {
		border-color: ${({ theme }) => theme.colors.link};
		box-shadow: rgba(0, 0, 0, 0.075) 0px 0.1rem 0.1rem inset,
			${({ theme }) => theme.colors.link}88 0px 0px 0.8rem;
	}

	input {
		flex-grow: 1;
		color: ${({ theme }) => theme.colors.fg};
		background-color: ${({ theme }) => theme.colors.bg};

		border: none;
		outline: none;
		padding: 0.85rem 1.4rem;
		padding-left: 0.2rem;
	}
`;

export const Prefix = styled.span`
	font-weight: 300;
	font-size: 14px;
	color: #999;
`;
