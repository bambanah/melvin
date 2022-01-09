import styled from "styled-components";

interface ContainerProps {
	error?: boolean;
}

export const Container = styled.div<ContainerProps>`
	display: flex;
	align-items: center;
	overflow: hidden;
	padding: 0 0.5rem;

	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};

	border: 0.01rem solid
		${(props) =>
			props.error ? props.theme.colors.error : props.theme.colors.fg};
	border-radius: 0.3rem;

	&:focus-within {
		border-color: ${({ theme }) => theme.colors.link};
		box-shadow: 0px 0px 10px ${({ theme }) => theme.colors.link}88;
	}

	input {
		color: ${({ theme }) => theme.colors.fg};
		background-color: ${({ theme }) => theme.colors.bg};

		border: none;
		outline: none;
		padding: 0.75rem 1.4rem;
		padding-left: 0.2rem;
	}
`;

export const Prefix = styled.span`
	font-weight: 300;
	font-size: 14px;
	color: #999;
`;
