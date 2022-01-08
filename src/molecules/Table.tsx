import React from "react";
import styled from "styled-components";

const StyledTable = styled.table`
	margin-top: 2rem;
	width: 100%;
	border-collapse: collapse;

	th,
	td {
		text-align: left;
		padding: 1.5rem 0.8rem;
	}
`;

const Table: React.FC = ({ children }) => <StyledTable>{children}</StyledTable>;

export default Table;
