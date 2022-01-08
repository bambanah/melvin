import { Field } from "formik";
import React from "react";
import styled from "styled-components";

interface SelectProps {
	error?: boolean;
}

const SelectContainer = styled.div<SelectProps>`
	border-radius: 3px;
	border: 1px solid
		${(props) => (props.error ? props.theme.colors.error : "transparent")};
	outline: none;
	box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.15);

	width: 100%;
	min-width: 15ch;
	max-width: 30ch;
	border-radius: 0.25em;
	line-height: 1.1;
	display: grid;
	grid-template-areas: "select";
	align-items: center;
	background-color: ${({ theme }) => theme.colors.fg};
	color: ${({ theme }) => theme.colors.bg};

	select {
		appearance: none;
		background-color: transparent;
		border: none;
		width: 100%;
		outline: none;
		grid-area: select;
		padding: 0.5rem 0.8rem;
		cursor: pointer;

		option {
			color: ${({ theme }) => theme.colors.bg};
			background-color: ${({ theme }) => theme.colors.fg};

			&:hover {
				color: blue;
			}
		}
	}

	&:focus {
		border: 1px solid
			${(props) => (props.error ? props.theme.colors.error : "#6e6e6e")};
	}

	&::after {
		content: "";
		width: 0.8em;
		height: 0.5em;
		background-color: ${({ theme }) => theme.colors.bg};
		clip-path: polygon(100% 0%, 0 0%, 50% 100%);
		grid-area: select;
		justify-self: end;
		margin-right: 0.5rem;
	}
`;

const Select = ({
	children,
	name,
	error,
}: React.HTMLProps<HTMLSelectElement> & SelectProps) => (
	<SelectContainer error={error || false}>
		<Field as="select" id={name} name={name}>
			{children}
		</Field>
	</SelectContainer>
);

export default Select;
