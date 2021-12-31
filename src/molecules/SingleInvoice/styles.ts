import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styled from "styled-components";

export const InvoiceRow = styled.tr`
	&:hover {
		background-color: #eee;
	}
`;

export const Actions = styled.div`
	display: flex;
	justify-content: right;
	align-items: center;
	gap: 0.6rem;
`;

export const Action = styled(FontAwesomeIcon)`
	cursor: pointer;

	&:hover {
		color: #777;
	}
`;

export const TableCell = styled.td`
	padding: 1rem 0.5rem;
`;