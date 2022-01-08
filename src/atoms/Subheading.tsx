import { shade } from "polished";
import styled from "styled-components";

const Subheading = styled.p`
	font-size: 0.9rem;
	color: ${({ theme }) => shade(0.2, theme.colors.fg)};
	margin: 0;
`;

export default Subheading;
