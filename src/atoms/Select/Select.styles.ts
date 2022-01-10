import styled from "styled-components";

interface SelectProps {
	error?: boolean;
}

export const SelectContainer = styled.div<SelectProps>`
	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};
	border: 1px solid
		${(props) =>
			props.error ? props.theme.colors.error : props.theme.colors.fg};
	outline: none;

	width: 100%;
	min-width: 15ch;
	max-width: 30ch;
	border-radius: 0.3rem;
	line-height: 1.1;
	display: grid;
	grid-template-areas: "select";
	align-items: center;

	&:focus-within {
		border: 1px solid
			${(props) => (props.error ? props.theme.colors.error : "#6e6e6e")};

		border-color: ${({ theme }) => theme.colors.brand};
		box-shadow: 0px 0px 10px ${({ theme }) => theme.colors.brand}88;
	}

	select {
		appearance: none;
		background-color: transparent;
		border: none;
		width: 100%;
		outline: none;
		grid-area: select;
		padding: 0.8rem 1.6rem;
		cursor: pointer;
		border-radius: 0.3rem;
		color: ${({ theme }) => theme.colors.fg};

		option {
			color: ${({ theme }) => theme.colors.fg};
			background-color: ${({ theme }) => theme.colors.bg};
		}
	}

	&::after {
		content: "";
		width: 0.8em;
		height: 0.5em;
		background-color: ${({ theme }) => theme.colors.fg};
		clip-path: polygon(100% 0%, 0 0%, 50% 100%);
		grid-area: select;
		justify-self: end;
		margin-right: 0.5rem;
	}
`;
