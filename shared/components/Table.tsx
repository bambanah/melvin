import React from "react";
import styled from "styled-components";

const StyledTable = styled.table`
	margin-top: 2rem;
	width: 100%;
	border: 0px;
`;

const Table: React.FC = ({ children }) => <StyledTable>{children}</StyledTable>;

export default Table;
