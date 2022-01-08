import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { darken, lighten } from "polished";
import styled from "styled-components";

export const InvoiceRow = styled.tr`
	cursor: pointer;

	&:hover {
		background-color: ${({ theme }) =>
			theme.type === "light"
				? darken(0.1, theme.colors.bg)
				: lighten(0.1, theme.colors.bg)};
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
