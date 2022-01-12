import styled from "styled-components";

interface ContainerProps {
	error?: boolean;
}

export const Container = styled.div<ContainerProps>`
	input {
		font-size: 1rem;
		cursor: pointer;
		padding: 0.6em;
		padding-left: 0.8em;
		color: ${({ theme }) => theme.colors.fg};
		background-color: ${({ theme }) => theme.colors.bg};
		outline: none;
		border: 0.01rem solid
			${({ error, theme }) => {
				if (error) {
					return theme.colors.error;
				}

				return theme.colors.fg + "88";
			}};
		border-radius: 0.3rem;

		&:focus {
			border-color: ${({ theme }) => theme.colors.link};
			box-shadow: rgba(0, 0, 0, 0.075) 0px 0.1rem 0.1rem inset,
				${({ theme }) => theme.colors.link}88 0px 0px 0.8rem;
		}
	}
`;
